-- Winner consent 48h deadline + seller skip / cascade to next bidder.

alter table public.auctions
  add column if not exists winner_consent_requested_at timestamptz;

comment on column public.auctions.winner_consent_requested_at is
  'When the current winner was asked for platform consent; seller may skip after 48h.';

update public.auctions
set winner_consent_requested_at = updated_at
where status = 'awaiting_winner_consent'
  and winner_consent_requested_at is null;

-- ---------------------------------------------------------------------------
-- Promote next highest eligible bidder (shared cascade logic)
-- ---------------------------------------------------------------------------
create or replace function public.auction_promote_next_winner (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_next_winner uuid;
  v_next_amount numeric;
  v_position integer;
begin
  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_position := coalesce(v_auction.winner_position, 1) + 1;

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
    update public.auctions
    set status = 'cancelled', updated_at = now()
    where id = p_auction_id;
    return jsonb_build_object('ok', true, 'message', 'no_more_bidders', 'has_more_bidders', false);
  end if;

  update public.auctions
  set
    winner_id = v_next_winner,
    current_highest_bid = v_next_amount,
    winner_position = v_position,
    winner_consent_given = false,
    winner_contact_phone = null,
    winner_consent_requested_at = now(),
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

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_auction.seller_id,
    'auction_pending_winner_consent',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'winning_amount', v_next_amount,
      'position', v_position
    )
  );

  return jsonb_build_object(
    'ok', true,
    'has_more_bidders', true,
    'position', v_position,
    'message', 'next_winner_selected'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Seller skips winner who did not consent within 48 hours
-- ---------------------------------------------------------------------------
create or replace function public.seller_skip_winner_no_consent (
  p_auction_id uuid,
  p_select_next boolean default false,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_user uuid := auth.uid ();
  v_deadline timestamptz;
  v_skipped_winner uuid;
  v_res jsonb;
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

  if v_auction.seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_deadline := coalesce(v_auction.winner_consent_requested_at, v_auction.updated_at) + interval '48 hours';
  if timezone('utc', now()) < v_deadline then
    return jsonb_build_object(
      'ok', false,
      'error', 'consent_deadline_not_reached',
      'available_at', v_deadline
    );
  end if;

  v_skipped_winner := v_auction.winner_id;

  update public.winner_cascade
  set
    skipped_at = now(),
    closure_outcome = 'cancelled_no_consent'
  where auction_id = p_auction_id and bidder_id = v_skipped_winner;

  if v_skipped_winner is not null then
    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_skipped_winner,
      'winner_consent_expired',
      jsonb_build_object(
        'auction_id', p_auction_id,
        'title', v_auction.title,
        'bid_number', v_auction.bid_number,
        'position', v_auction.winner_position,
        'notes', p_notes
      )
    );
  end if;

  if p_select_next then
    v_res := public.auction_promote_next_winner (p_auction_id);
    return v_res;
  end if;

  update public.auctions
  set status = 'cancelled', updated_at = now()
  where id = p_auction_id;

  return jsonb_build_object('ok', true, 'message', 'cancelled', 'has_more_bidders', false);
end;
$$;

grant execute on function public.seller_skip_winner_no_consent (uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- close_single_expired_auction: stamp consent requested time
-- ---------------------------------------------------------------------------
create or replace function public.close_single_expired_auction (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_winner uuid;
  v_max numeric;
  v_new_status text;
begin
  select a.id, a.seller_id, a.title, a.payment_instructions, a.bid_number, a.communication_code, a.seller_phone, a.status, a.ends_at
  into v_rec
  from public.auctions a
  where a.id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_rec.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active', 'status', v_rec.status);
  end if;

  if timezone('utc', now()) <= v_rec.ends_at then
    return jsonb_build_object('ok', false, 'error', 'not_ended');
  end if;

  select b.bidder_id, b.amount into v_winner, v_max
  from public.bids b
  where b.auction_id = v_rec.id
  order by b.amount desc, b.created_at desc
  limit 1;

  if v_winner is null then
    update public.auctions set status = 'ended', winner_id = null, updated_at = now() where id = v_rec.id;
    v_new_status := 'ended';
  else
    update public.auctions
    set
      status = 'awaiting_winner_consent',
      winner_id = v_winner,
      current_highest_bid = v_max,
      winner_position = 1,
      winner_consent_given = false,
      winner_consent_requested_at = now(),
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
      'auction_pending_winner_consent',
      jsonb_build_object(
        'auction_id', v_rec.id,
        'title', v_rec.title,
        'bid_number', v_rec.bid_number,
        'winning_amount', v_max,
        'position', 1
      )
    );

    v_new_status := 'awaiting_winner_consent';
  end if;

  insert into public.notification_outbox (user_id, type, payload)
  select bidder_id, 'auction_ended', jsonb_build_object('auction_id', v_rec.id, 'title', v_rec.title)
  from (
    select distinct bidder_id from public.bids where auction_id = v_rec.id
  ) d;

  return jsonb_build_object('ok', true, 'status', v_new_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- seller_submit_closure: reuse cascade helper at payment stage
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
  v_res jsonb;
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
    v_res := public.auction_promote_next_winner (p_auction_id);
    return v_res;
  else
    update public.auctions set status = 'cancelled', updated_at = now() where id = p_auction_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
