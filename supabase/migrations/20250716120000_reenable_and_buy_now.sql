-- Re-enable ended (no-bid) auctions + optional Buy Now request → seller accept → payment_stage.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.auctions
  add column if not exists buy_now_price numeric(14, 2);

comment on column public.auctions.buy_now_price is
  'Optional fixed Buy Now price. When set, buyers may request purchase at this amount; seller must accept.';

alter table public.auctions
  drop constraint if exists auctions_buy_now_price_chk;

alter table public.auctions
  add constraint auctions_buy_now_price_chk
  check (
    buy_now_price is null
    or (buy_now_price > 0 and buy_now_price > starting_price)
  );

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'buy_now_request_status'
  ) then
    create type public.buy_now_request_status as enum (
      'pending',
      'accepted',
      'declined',
      'cancelled',
      'superseded'
    );
  end if;
end $$;

create table if not exists public.buy_now_requests (
  id uuid primary key default gen_random_uuid (),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  status public.buy_now_request_status not null default 'pending',
  created_at timestamptz not null default now (),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create index if not exists buy_now_requests_auction_idx
  on public.buy_now_requests (auction_id, created_at desc);

create index if not exists buy_now_requests_buyer_idx
  on public.buy_now_requests (buyer_id, created_at desc);

create unique index if not exists buy_now_requests_one_pending_per_auction
  on public.buy_now_requests (auction_id)
  where status = 'pending';

create unique index if not exists buy_now_requests_one_pending_per_buyer_auction
  on public.buy_now_requests (auction_id, buyer_id)
  where status = 'pending';

alter table public.buy_now_requests enable row level security;

drop policy if exists buy_now_requests_select on public.buy_now_requests;
create policy buy_now_requests_select on public.buy_now_requests for select using (
  public.is_admin ()
  or buyer_id = auth.uid ()
  or exists (
    select 1
    from public.auctions a
    where a.id = buy_now_requests.auction_id
      and a.seller_id = auth.uid ()
  )
);

-- Sellers can read buyer display names for pending Buy Now requests on their lots.
drop policy if exists profiles_visible_via_buy_now_requests on public.profiles;
create policy profiles_visible_via_buy_now_requests on public.profiles for select using (
  exists (
    select 1
    from public.buy_now_requests r
    join public.auctions a on a.id = r.auction_id
    where r.buyer_id = profiles.id
      and a.seller_id = auth.uid ()
      and r.status = 'pending'
  )
);

-- ---------------------------------------------------------------------------
-- seller_reenable_auction
-- ---------------------------------------------------------------------------
create or replace function public.seller_reenable_auction (
  p_auction_id uuid,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_auction public.auctions;
  v_bid_count integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_ends_at is null or p_ends_at <= now () then
    return jsonb_build_object('ok', false, 'error', 'ends_at_must_be_future');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_auction.status <> 'ended' then
    return jsonb_build_object('ok', false, 'error', 'not_ended');
  end if;

  select count(*)::integer into v_bid_count
  from public.bids
  where auction_id = p_auction_id;

  if v_bid_count > 0 or coalesce(v_auction.bid_count, 0) > 0 then
    return jsonb_build_object('ok', false, 'error', 'has_bids');
  end if;

  if p_ends_at <= v_auction.starts_at then
    return jsonb_build_object('ok', false, 'error', 'ends_at_before_starts_at');
  end if;

  update public.auctions
  set
    status = 'active',
    ends_at = p_ends_at,
    winner_id = null,
    winner_position = 1,
    winner_consent_given = false,
    winner_contact_phone = null,
    winner_consent_requested_at = null,
    winner_consent_terms_version = null,
    winner_contacted_at = null,
    current_highest_bid = null,
    updated_at = now ()
  where id = p_auction_id;

  return jsonb_build_object('ok', true, 'status', 'active', 'ends_at', p_ends_at);
end;
$$;

grant execute on function public.seller_reenable_auction (uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- buyer_request_buy_now
-- ---------------------------------------------------------------------------
create or replace function public.buyer_request_buy_now (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_auction public.auctions;
  v_existing uuid;
  v_other uuid;
  v_request_id uuid;
  v_buyer_name text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.seller_id = v_user then
    return jsonb_build_object('ok', false, 'error', 'own_listing');
  end if;

  if v_auction.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if now () < v_auction.starts_at or now () > v_auction.ends_at then
    return jsonb_build_object('ok', false, 'error', 'outside_window');
  end if;

  if v_auction.buy_now_price is null then
    return jsonb_build_object('ok', false, 'error', 'buy_now_not_enabled');
  end if;

  if exists (
    select 1 from public.profiles p where p.id = v_user and p.suspended_at is not null
  ) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  select id into v_existing
  from public.buy_now_requests
  where auction_id = p_auction_id
    and buyer_id = v_user
    and status = 'pending'
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('ok', true, 'request_id', v_existing, 'already_pending', true);
  end if;

  select id into v_other
  from public.buy_now_requests
  where auction_id = p_auction_id
    and status = 'pending'
  limit 1;

  if v_other is not null then
    return jsonb_build_object('ok', false, 'error', 'request_pending');
  end if;

  insert into public.buy_now_requests (auction_id, buyer_id, amount, status)
  values (p_auction_id, v_user, v_auction.buy_now_price, 'pending')
  returning id into v_request_id;

  select display_name into v_buyer_name from public.profiles where id = v_user;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_auction.seller_id,
    'buy_now_requested',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'amount', v_auction.buy_now_price,
      'request_id', v_request_id,
      'buyer_id', v_user,
      'buyer_name', coalesce(v_buyer_name, 'Buyer')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'amount', v_auction.buy_now_price
  );
end;
$$;

grant execute on function public.buyer_request_buy_now (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- buyer_cancel_buy_now_request
-- ---------------------------------------------------------------------------
create or replace function public.buyer_cancel_buy_now_request (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_auction public.auctions;
  v_req public.buy_now_requests;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_req
  from public.buy_now_requests
  where auction_id = p_auction_id
    and buyer_id = v_user
    and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_pending_request');
  end if;

  update public.buy_now_requests
  set
    status = 'cancelled',
    resolved_at = now (),
    resolved_by = v_user
  where id = v_req.id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_auction.seller_id,
    'buy_now_cancelled',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'amount', v_req.amount,
      'request_id', v_req.id
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.buyer_cancel_buy_now_request (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_accept_buy_now
-- ---------------------------------------------------------------------------
create or replace function public.seller_accept_buy_now (p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_req public.buy_now_requests;
  v_auction public.auctions;
  v_buyer_phone text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_req
  from public.buy_now_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  select * into v_auction
  from public.auctions
  where id = v_req.auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'auction_not_found');
  end if;

  if v_auction.seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_auction.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  select phone into v_buyer_phone from public.profiles where id = v_req.buyer_id;

  update public.auctions
  set
    status = 'payment_stage',
    winner_id = v_req.buyer_id,
    winner_position = 1,
    winner_consent_given = true,
    winner_contacted_at = now (),
    winner_contact_phone = v_buyer_phone,
    winner_consent_requested_at = now (),
    winner_consent_terms_version = 'buy_now',
    current_highest_bid = v_req.amount,
    updated_at = now ()
  where id = v_auction.id;

  if not exists (
    select 1 from public.winner_cascade
    where auction_id = v_auction.id and bidder_id = v_req.buyer_id
  ) then
    insert into public.winner_cascade (auction_id, bidder_id, position, consented_at)
    values (v_auction.id, v_req.buyer_id, 1, now ());
  else
    update public.winner_cascade
    set consented_at = now (), position = 1
    where auction_id = v_auction.id and bidder_id = v_req.buyer_id;
  end if;

  update public.buy_now_requests
  set
    status = 'accepted',
    resolved_at = now (),
    resolved_by = v_user
  where id = v_req.id;

  update public.buy_now_requests
  set
    status = 'superseded',
    resolved_at = now (),
    resolved_by = v_user
  where auction_id = v_auction.id
    and status = 'pending'
    and id <> v_req.id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_req.buyer_id,
    'buy_now_accepted',
    jsonb_build_object(
      'auction_id', v_auction.id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'amount', v_req.amount,
      'communication_code', v_auction.communication_code,
      'seller_phone', v_auction.seller_phone,
      'request_id', v_req.id
    )
  );

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_auction.seller_id,
    'winner_consented',
    jsonb_build_object(
      'auction_id', v_auction.id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'winning_amount', v_req.amount,
      'winner_phone', v_buyer_phone,
      'position', 1,
      'via_buy_now', true
    )
  );

  insert into public.notification_outbox (user_id, type, payload)
  select bidder_id, 'auction_ended', jsonb_build_object('auction_id', v_auction.id, 'title', v_auction.title)
  from (
    select distinct bidder_id
    from public.bids
    where auction_id = v_auction.id
      and bidder_id <> v_req.buyer_id
  ) d;

  return jsonb_build_object(
    'ok', true,
    'status', 'payment_stage',
    'winner_id', v_req.buyer_id,
    'amount', v_req.amount
  );
end;
$$;

grant execute on function public.seller_accept_buy_now (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_decline_buy_now
-- ---------------------------------------------------------------------------
create or replace function public.seller_decline_buy_now (p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_req public.buy_now_requests;
  v_auction public.auctions;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_req
  from public.buy_now_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  select * into v_auction
  from public.auctions
  where id = v_req.auction_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'auction_not_found');
  end if;

  if v_auction.seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.buy_now_requests
  set
    status = 'declined',
    resolved_at = now (),
    resolved_by = v_user
  where id = v_req.id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_req.buyer_id,
    'buy_now_declined',
    jsonb_build_object(
      'auction_id', v_auction.id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'amount', v_req.amount,
      'request_id', v_req.id
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.seller_decline_buy_now (uuid) to authenticated;
