-- RLS helper: is admin
create or replace function public.is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.suspended_at is null
  );
$$;

grant execute on function public.is_admin () to authenticated;

-- place_bid
create or replace function public.place_bid (p_auction_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_user_id uuid := auth.uid();
  v_min numeric;
  v_prev_leader uuid;
  v_prev_amount numeric;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (select 1 from public.profiles where id = v_user_id and suspended_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.seller_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'own_auction');
  end if;

  if v_auction.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if timezone('utc', now()) < v_auction.starts_at or timezone('utc', now()) > v_auction.ends_at then
    return jsonb_build_object('ok', false, 'error', 'outside_window');
  end if;

  select b.bidder_id, b.amount into v_prev_leader, v_prev_amount
  from public.bids b
  where b.auction_id = p_auction_id
  order by b.amount desc, b.created_at desc
  limit 1;

  if v_prev_amount is null then
    v_min := v_auction.starting_price;
  else
    v_min := v_prev_amount + v_auction.min_bid_increment;
  end if;

  if p_amount < v_min then
    return jsonb_build_object('ok', false, 'error', 'below_min', 'min_required', v_min);
  end if;

  insert into public.bids (auction_id, bidder_id, amount)
  values (p_auction_id, v_user_id, p_amount);

  update public.auctions
  set
    current_highest_bid = p_amount,
    bid_count = bid_count + 1,
    updated_at = now()
  where id = p_auction_id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_user_id,
    'bid_placed',
    jsonb_build_object('auction_id', p_auction_id, 'amount', p_amount)
  );

  if v_prev_leader is not null and v_prev_leader <> v_user_id then
    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_prev_leader,
      'outbid',
      jsonb_build_object('auction_id', p_auction_id, 'new_amount', p_amount)
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.place_bid (uuid, numeric) to authenticated;

-- Seller: submit draft / pending for approval
create or replace function public.submit_auction_for_approval (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v public.auctions;
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
  update public.auctions
  set status = 'pending_approval', rejection_reason = null, updated_at = now()
  where id = p_auction_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_auction_for_approval (uuid) to authenticated;

-- Admin approve
create or replace function public.admin_approve_auction (p_auction_id uuid)
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
  where id = p_auction_id and status = 'pending_approval'
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;
  update public.auctions
  set status = 'active', updated_at = now()
  where id = p_auction_id;
  insert into public.notification_outbox (user_id, type, payload)
  values (v_seller, 'listing_approved', jsonb_build_object('auction_id', p_auction_id));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_approve_auction (uuid) to authenticated;

-- Admin reject
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
  where id = p_auction_id and status = 'pending_approval'
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

grant execute on function public.admin_reject_auction (uuid, text) to authenticated;

-- Suspend user (admin)
create or replace function public.admin_set_user_suspended (p_user_id uuid, p_suspend boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_user_id = auth.uid () then
    return jsonb_build_object('ok', false, 'error', 'cannot_self');
  end if;
  update public.profiles
  set suspended_at = case when p_suspend then now() else null end,
      updated_at = now()
  where id = p_user_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_user_suspended (uuid, boolean) to authenticated;

-- Seller marks paid (after winner pays offline)
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
  if v.status <> 'won' then
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

grant execute on function public.seller_mark_auction_paid (uuid) to authenticated;

-- Admin mark completed
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
  where id = p_auction_id and status in ('paid', 'won');
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_mark_auction_completed (uuid) to authenticated;

-- Close expired auctions (called by Edge Function with service role)
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
    select a.id, a.seller_id, a.title, a.payment_instructions
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
        status = 'won',
        winner_id = v_winner,
        current_highest_bid = v_max,
        updated_at = now()
      where id = v_rec.id;

      insert into public.notification_outbox (user_id, type, payload)
      values (
        v_winner,
        'won_auction',
        jsonb_build_object(
          'auction_id', v_rec.id,
          'title', v_rec.title,
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

grant execute on function public.close_expired_auctions () to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.auctions enable row level security;
alter table public.auction_images enable row level security;
alter table public.bids enable row level security;
alter table public.complaints enable row level security;
alter table public.notification_outbox enable row level security;

-- Categories: read all
create policy categories_select_all on public.categories for select using (true);

-- Profiles
create policy profiles_select_own on public.profiles for select using (id = auth.uid () or public.is_admin ());
-- Allow reading seller display for visible auctions
create policy profiles_select_as_seller on public.profiles for select using (
  exists (
    select 1
    from public.auctions a
    where a.seller_id = profiles.id
      and a.status in ('active', 'ended', 'won', 'paid', 'completed')
      and not exists (
        select 1
        from public.profiles sp
        where sp.id = a.seller_id
          and sp.suspended_at is not null
      )
  )
);
create policy profiles_update_own on public.profiles for update using (id = auth.uid ()) with check (id = auth.uid ());

-- Auctions: public-ish read (hide active listings from suspended sellers)
create policy auctions_select on public.auctions for select using (
  public.is_admin ()
  or seller_id = auth.uid ()
  or (
    status in ('active', 'ended', 'won', 'paid', 'completed')
    and not exists (
      select 1
      from public.profiles p
      where p.id = auctions.seller_id
        and p.suspended_at is not null
    )
  )
);

-- Inserts: authenticated seller creates own
create policy auctions_insert on public.auctions for insert with check (seller_id = auth.uid ());

create policy auctions_update_seller on public.auctions for update using (
  public.is_admin ()
  or (
    seller_id = auth.uid ()
    and status in ('draft', 'pending_approval')
  )
) with check (
  public.is_admin ()
  or seller_id = auth.uid ()
);

-- Images
create policy auction_images_select on public.auction_images for select using (
  exists (
    select 1 from public.auctions a
    where a.id = auction_id
      and (
        public.is_admin ()
        or a.seller_id = auth.uid ()
        or a.status in ('active', 'pending_approval', 'ended', 'won', 'paid', 'completed')
      )
  )
);

create policy auction_images_insert on public.auction_images for insert with check (
  exists (
    select 1 from public.auctions a
    where a.id = auction_id and a.seller_id = auth.uid () and a.status = 'draft'
  )
);

create policy auction_images_delete on public.auction_images for delete using (
  exists (
    select 1 from public.auctions a
    where a.id = auction_id and a.seller_id = auth.uid () and a.status = 'draft'
  )
);

-- Bids: read if can see auction
create policy bids_select on public.bids for select using (
  exists (
    select 1 from public.auctions a
    where a.id = auction_id
      and (
        public.is_admin ()
        or a.seller_id = auth.uid ()
        or a.status in ('active', 'ended', 'won', 'paid', 'completed')
      )
  )
);

-- Direct bid insert disabled — use RPC only (no insert policy for authenticated)

-- Complaints
create policy complaints_insert on public.complaints for insert with check (reporter_id = auth.uid ());
create policy complaints_select on public.complaints for select using (reporter_id = auth.uid () or public.is_admin ());

-- Outbox: users see own; service role bypasses RLS
create policy notification_outbox_select on public.notification_outbox for select using (user_id = auth.uid () or public.is_admin ());
