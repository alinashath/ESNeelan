-- Featured bid RPCs, submit flow, close-expired, RLS visibility for new statuses, notification read policy.

-- ---------------------------------------------------------------------------
-- Visible auction statuses for public read (non-owner)
-- ---------------------------------------------------------------------------
-- draft, pending_approval, awaiting_payment, cancelled: not listed publicly

-- ---------------------------------------------------------------------------
-- submit_auction_for_approval: standard -> pending_approval; featured -> awaiting_payment (+ proof)
-- ---------------------------------------------------------------------------
create or replace function public.submit_auction_for_approval (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v public.auctions;
  v_role public.user_role;
  v_sv text;
  v_next_status public.auction_status;
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v from public.auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v.seller_id <> v_seller then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if v.status not in ('draft', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select p.role, p.seller_verification_status
  into v_role, v_sv
  from public.profiles p
  where p.id = v_seller;

  if v_role is distinct from 'admin' and coalesce(v_sv, 'none') <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'seller_not_verified');
  end if;

  if v.bid_type = 'featured' then
    if coalesce(v.listing_fee_proof_path, '') = '' then
      return jsonb_build_object('ok', false, 'error', 'listing_fee_proof_required');
    end if;
    v_next_status := 'awaiting_payment';
  else
    v_next_status := 'pending_approval';
  end if;

  update public.auctions
  set
    status = v_next_status,
    rejection_reason = null,
    updated_at = now()
  where id = p_auction_id;

  if v_next_status = 'awaiting_payment' then
    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_seller,
      'payment_proof_received',
      jsonb_build_object('auction_id', p_auction_id, 'title', v.title)
    );
  end if;

  return jsonb_build_object('ok', true, 'status', v_next_status::text);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_approve_auction: codes + active (from pending_approval OR post-fee featured)
-- ---------------------------------------------------------------------------
create or replace function public.admin_approve_auction (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_bid_num text;
  v_comm_code text;
  v_auction public.auctions;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
    and (
      status = 'pending_approval'
      or (
        status = 'awaiting_payment'
        and bid_type = 'featured'
        and listing_fee_paid = true
      )
    )
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;

  v_seller := v_auction.seller_id;

  v_bid_num := 'BID-' || lpad(nextval('public.bid_number_seq')::text, 5, '0');
  v_comm_code := upper(
    substring(replace(gen_random_uuid ()::text, '-', ''), 1, 4) || '-' ||
    substring(replace(gen_random_uuid ()::text, '-', ''), 1, 4)
  );

  update public.auctions
  set
    status = 'active',
    bid_number = v_bid_num,
    communication_code = v_comm_code,
    seller_phone = (select phone from public.profiles where id = v_seller),
    updated_at = now()
  where id = p_auction_id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_seller,
    'listing_approved_with_codes',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_bid_num,
      'communication_code', v_comm_code
    )
  );

  return jsonb_build_object(
    'ok', true,
    'bid_number', v_bid_num,
    'communication_code', v_comm_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_verify_featured_payment
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_featured_payment (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.auctions
  set listing_fee_paid = true, updated_at = now()
  where id = p_auction_id
    and bid_type = 'featured'
    and status = 'awaiting_payment';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_invalid');
  end if;

  return public.admin_approve_auction (p_auction_id);
end;
$$;

grant execute on function public.admin_verify_featured_payment (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_reject_auction: also reject awaiting_payment (featured fee queue)
-- ---------------------------------------------------------------------------
create or replace function public.admin_reject_auction (p_auction_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select seller_id into v_seller
  from public.auctions
  where id = p_auction_id and status in ('pending_approval', 'awaiting_payment')
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;

  update public.auctions
  set
    status = 'cancelled',
    rejection_reason = coalesce(p_reason, 'Rejected'),
    updated_at = now()
  where id = p_auction_id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_seller,
    'listing_rejected',
    jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- close_expired_auctions: awaiting_winner_consent + winner_cascade + notification
-- ---------------------------------------------------------------------------
create or replace function public.close_expired_auctions ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_winner uuid;
  v_max numeric;
  n int := 0;
begin
  for v_rec in
    select a.id, a.seller_id, a.title, a.payment_instructions, a.bid_number, a.communication_code, a.seller_phone
    from public.auctions a
    where a.status = 'active'
      and timezone('utc', now()) > a.ends_at
    for update skip locked
  loop
    select b.bidder_id, b.amount into v_winner, v_max
    from public.bids b
    where b.auction_id = v_rec.id
    order by b.amount desc, b.created_at desc
    limit 1;

    if v_winner is null then
      update public.auctions set status = 'ended', winner_id = null, updated_at = now() where id = v_rec.id;
    else
      update public.auctions
      set
        status = 'awaiting_winner_consent',
        winner_id = v_winner,
        current_highest_bid = v_max,
        winner_position = 1,
        winner_consent_given = false,
        updated_at = now()
      where id = v_rec.id;

      insert into public.winner_cascade (auction_id, bidder_id, position)
      values (v_rec.id, v_winner, 1);

      insert into public.notification_outbox (user_id, type, payload)
      values (
        v_winner,
        'winner_consent_requested',
        jsonb_build_object(
          'auction_id', v_rec.id,
          'title', v_rec.title,
          'bid_number', v_rec.bid_number,
          'winning_amount', v_max,
          'communication_code', v_rec.communication_code,
          'seller_phone', v_rec.seller_phone,
          'position', 1,
          'payment_instructions', coalesce(v_rec.payment_instructions, 'Contact the seller for payment details.')
        )
      );

      insert into public.notification_outbox (user_id, type, payload)
      values (
        v_rec.seller_id,
        'auction_winner',
        jsonb_build_object('auction_id', v_rec.id, 'winner_id', v_winner, 'amount', v_max)
      );
    end if;

    insert into public.notification_outbox (user_id, type, payload)
    select bidder_id, 'auction_ended', jsonb_build_object('auction_id', v_rec.id)
    from (
      select distinct bidder_id from public.bids where auction_id = v_rec.id
    ) d;

    n := n + 1;
  end loop;

  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- winner_give_consent
-- ---------------------------------------------------------------------------
create or replace function public.winner_give_consent (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_user uuid := auth.uid ();
  v_buyer_phone text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id and status = 'awaiting_winner_consent'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.winner_id is distinct from v_user then
    return jsonb_build_object('ok', false, 'error', 'not_winner');
  end if;

  select phone into v_buyer_phone from public.profiles where id = v_user;

  update public.auctions
  set
    status = 'payment_stage',
    winner_consent_given = true,
    winner_contacted_at = now(),
    winner_contact_phone = v_buyer_phone,
    updated_at = now()
  where id = p_auction_id;

  update public.winner_cascade
  set consented_at = now()
  where auction_id = p_auction_id and bidder_id = v_user;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_auction.seller_id,
    'winner_consented',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'winning_amount', v_auction.current_highest_bid,
      'winner_phone', v_buyer_phone,
      'position', v_auction.winner_position
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.winner_give_consent (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_submit_closure
-- ---------------------------------------------------------------------------
create or replace function public.seller_submit_closure (
  p_auction_id uuid,
  p_outcome text,
  p_notes text default null,
  p_select_next boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_user uuid := auth.uid ();
  v_next_winner uuid;
  v_next_amount numeric;
  v_position integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id and status = 'payment_stage'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.auction_closure_reports
    (auction_id, seller_id, outcome, notes, select_next)
  values
    (p_auction_id, v_user, p_outcome, p_notes, p_select_next);

  update public.winner_cascade
  set closure_outcome = p_outcome
  where auction_id = p_auction_id and bidder_id = v_auction.winner_id;

  if p_outcome = 'completed' then
    update public.auctions set status = 'completed', updated_at = now() where id = p_auction_id;

    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_auction.winner_id,
      'please_leave_feedback',
      jsonb_build_object('auction_id', p_auction_id, 'title', v_auction.title)
    );

  elsif p_select_next then
    v_position := v_auction.winner_position + 1;

    select b.bidder_id, b.amount
    into v_next_winner, v_next_amount
    from public.bids b
    where b.auction_id = p_auction_id
      and b.bidder_id <> v_auction.winner_id
      and b.bidder_id not in (
        select wc.bidder_id from public.winner_cascade wc where wc.auction_id = p_auction_id
      )
    order by b.amount desc, b.created_at desc
    limit 1;

    if v_next_winner is null then
      update public.auctions set status = 'cancelled', updated_at = now() where id = p_auction_id;
      return jsonb_build_object('ok', true, 'message', 'no_more_bidders');
    end if;

    update public.auctions
    set
      winner_id = v_next_winner,
      current_highest_bid = v_next_amount,
      winner_position = v_position,
      winner_consent_given = false,
      winner_contact_phone = null,
      status = 'awaiting_winner_consent',
      updated_at = now()
    where id = p_auction_id;

    insert into public.winner_cascade (auction_id, bidder_id, position)
    values (p_auction_id, v_next_winner, v_position);

    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_next_winner,
      'winner_consent_requested',
      jsonb_build_object(
        'auction_id', p_auction_id,
        'title', v_auction.title,
        'bid_number', v_auction.bid_number,
        'winning_amount', v_next_amount,
        'communication_code', v_auction.communication_code,
        'seller_phone', v_auction.seller_phone,
        'position', v_position,
        'payment_instructions', coalesce(v_auction.payment_instructions, 'Contact the seller for payment details.')
      )
    );

  else
    update public.auctions set status = 'cancelled', updated_at = now() where id = p_auction_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.seller_submit_closure (uuid, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- buyer_submit_feedback
-- ---------------------------------------------------------------------------
create or replace function public.buyer_submit_feedback (
  p_auction_id uuid,
  p_stars smallint,
  p_feedback_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_user uuid := auth.uid ();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction from public.auctions where id = p_auction_id;

  if not found or v_auction.winner_id is distinct from v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_auction.status <> 'completed' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  insert into public.seller_ratings
    (auction_id, buyer_id, seller_id, stars, feedback_type)
  values
    (p_auction_id, v_user, v_auction.seller_id, p_stars, p_feedback_type)
  on conflict (auction_id, buyer_id) do update
    set stars = excluded.stars, feedback_type = excluded.feedback_type;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.buyer_submit_feedback (uuid, smallint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_mark_auction_paid: include payment_stage (post-consent flow)
-- ---------------------------------------------------------------------------
create or replace function public.seller_mark_auction_paid (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.auctions;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select * into v from public.auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v.seller_id <> auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if v.status not in ('won', 'payment_stage') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  update public.auctions set status = 'paid', updated_at = now() where id = p_auction_id;
  if v.winner_id is not null then
    insert into public.notification_outbox (user_id, type, payload)
    values (v.winner_id, 'marked_paid', jsonb_build_object('auction_id', p_auction_id));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_mark_auction_completed: include payment_stage
-- ---------------------------------------------------------------------------
create or replace function public.admin_mark_auction_completed (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.auctions
  set status = 'completed', updated_at = now()
  where id = p_auction_id and status in ('paid', 'won', 'payment_stage');
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: auctions public visibility
-- ---------------------------------------------------------------------------
drop policy if exists auctions_select on public.auctions;
create policy auctions_select on public.auctions for select using (
  public.is_admin ()
  or seller_id = auth.uid ()
  or (
    status in (
      'active',
      'ended',
      'won',
      'paid',
      'completed',
      'awaiting_winner_consent',
      'payment_stage'
    )
    and not exists (
      select 1
      from public.profiles p
      where p.id = auctions.seller_id
        and p.suspended_at is not null
    )
  )
);

drop policy if exists auction_images_select on public.auction_images;
create policy auction_images_select on public.auction_images for select using (
  exists (
    select 1 from public.auctions a
    where a.id = auction_id
      and (
        public.is_admin ()
        or a.seller_id = auth.uid ()
        or a.status in (
          'active',
          'pending_approval',
          'ended',
          'won',
          'paid',
          'completed',
          'awaiting_winner_consent',
          'payment_stage'
        )
      )
  )
);

drop policy if exists bids_select on public.bids;
create policy bids_select on public.bids for select using (
  exists (
    select 1 from public.auctions a
    where a.id = auction_id
      and (
        public.is_admin ()
        or a.seller_id = auth.uid ()
        or a.status in (
          'active',
          'ended',
          'won',
          'paid',
          'completed',
          'awaiting_winner_consent',
          'payment_stage'
        )
      )
  )
);

drop policy if exists auction_categories_select on public.auction_categories;
create policy auction_categories_select on public.auction_categories for select using (
  exists (
    select 1
    from public.auctions a
    where a.id = auction_categories.auction_id
      and (
        public.is_admin ()
        or a.seller_id = auth.uid ()
        or (
          a.status in (
            'active',
            'ended',
            'won',
            'paid',
            'completed',
            'awaiting_winner_consent',
            'payment_stage'
          )
          and not public.profile_is_suspended (a.seller_id)
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- notification_outbox: mark read (in-app)
-- ---------------------------------------------------------------------------
drop policy if exists notification_outbox_update_own on public.notification_outbox;
create policy notification_outbox_update_own on public.notification_outbox
  for update
  using (user_id = auth.uid ())
  with check (user_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- profiles: extend visibility for post-auction statuses (replaces 20250522140000 lists)
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_as_seller on public.profiles;
create policy profiles_select_as_seller on public.profiles for select using (
  exists (
    select 1
    from public.auctions a
    where a.seller_id = profiles.id
      and a.status in (
        'active',
        'ended',
        'won',
        'paid',
        'completed',
        'awaiting_winner_consent',
        'payment_stage'
      )
      and not public.profile_is_suspended (a.seller_id)
  )
);

drop policy if exists profiles_visible_via_public_bids on public.profiles;
create policy profiles_visible_via_public_bids on public.profiles for select using (
  exists (
    select 1
    from public.bids b
    join public.auctions a on a.id = b.auction_id
    where b.bidder_id = profiles.id
      and a.status in (
        'active',
        'ended',
        'won',
        'paid',
        'completed',
        'awaiting_winner_consent',
        'payment_stage'
      )
      and not public.profile_is_suspended (a.seller_id)
  )
);
