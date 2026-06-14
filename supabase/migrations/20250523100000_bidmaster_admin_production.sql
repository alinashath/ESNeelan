-- BidMaster production: app settings (platform fee), seller verification, featured sort order.

-- ---------------------------------------------------------------------------
-- app_settings (singleton row id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  platform_fee_percent numeric(5, 2) not null default 0
    check (platform_fee_percent >= 0 and platform_fee_percent <= 100),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, platform_fee_percent)
values (1, 0)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists app_settings_select_anon on public.app_settings;
create policy app_settings_select_anon
  on public.app_settings
  for select
  to anon
  using (true);

-- No insert/update/delete for clients (only service role / RPC bypass)

-- ---------------------------------------------------------------------------
-- profiles: seller verification
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists seller_verification_status text not null default 'none'
    constraint profiles_seller_verification_status_chk
      check (seller_verification_status in ('none', 'pending', 'approved', 'rejected')),
  add column if not exists seller_verification_note text,
  add column if not exists seller_applied_at timestamptz,
  add column if not exists seller_decided_at timestamptz;

-- Existing users can keep listing without re-applying.
update public.profiles
set
  seller_verification_status = 'approved',
  seller_decided_at = coalesce(seller_decided_at, now())
where seller_verification_status = 'none';

-- Guard: non-admins may only move none/rejected -> pending via direct update;
-- admins and service_role may set any status (RPCs use security definer).
create or replace function public.profiles_seller_verification_guard ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_role text := coalesce(auth.jwt () ->> 'role', '');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.seller_verification_status is not distinct from old.seller_verification_status
    and new.seller_verification_note is not distinct from old.seller_verification_note
    and new.seller_applied_at is not distinct from old.seller_applied_at
    and new.seller_decided_at is not distinct from old.seller_decided_at then
    return new;
  end if;

  if v_jwt_role = 'service_role' or public.is_admin () then
    return new;
  end if;

  if new.seller_verification_status is distinct from old.seller_verification_status then
    if new.seller_verification_status = 'pending'
      and old.seller_verification_status in ('none', 'rejected') then
      new.seller_applied_at := coalesce(new.seller_applied_at, now());
      new.seller_decided_at := null;
      new.seller_verification_note := null;
      return new;
    end if;
    raise exception 'forbidden_seller_status_change';
  end if;

  raise exception 'forbidden_seller_verification_edit';
end;
$$;

drop trigger if exists profiles_seller_verification_guard on public.profiles;
create trigger profiles_seller_verification_guard
  before update on public.profiles
  for each row
  execute function public.profiles_seller_verification_guard ();

-- ---------------------------------------------------------------------------
-- auctions: featured sort order (admin-only writes via trigger + RPC)
-- ---------------------------------------------------------------------------
alter table public.auctions
  add column if not exists featured_sort_order integer;

create index if not exists auctions_featured_sort_idx
  on public.auctions (is_featured, featured_sort_order, created_at desc)
  where is_featured = true and status = 'active';

create or replace function public.enforce_auction_featured_guard ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce((auth.jwt () ->> 'role'), '') <> 'service_role' and not public.is_admin () then
      new.is_featured := false;
      new.featured_sort_order := null;
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.is_featured is distinct from old.is_featured then
      if coalesce((auth.jwt () ->> 'role'), '') <> 'service_role' and not public.is_admin () then
        new.is_featured := old.is_featured;
      end if;
    end if;
    if new.featured_sort_order is distinct from old.featured_sort_order then
      if coalesce((auth.jwt () ->> 'role'), '') <> 'service_role' and not public.is_admin () then
        new.featured_sort_order := old.featured_sort_order;
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_auction_for_approval: require approved seller (admin bypass)
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

  update public.auctions
  set status = 'pending_approval', rejection_reason = null, updated_at = now()
  where id = p_auction_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- request_seller_verification
-- ---------------------------------------------------------------------------
create or replace function public.request_seller_verification ()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sv text;
  n int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select seller_verification_status into v_sv
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_sv = 'approved' then
    return jsonb_build_object('ok', true, 'state', 'already_approved');
  end if;
  if v_sv = 'pending' then
    return jsonb_build_object('ok', true, 'state', 'already_pending');
  end if;

  update public.profiles
  set
    seller_verification_status = 'pending',
    seller_applied_at = now(),
    seller_decided_at = null,
    seller_verification_note = null,
    updated_at = now()
  where id = v_uid and seller_verification_status in ('none', 'rejected');

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_state');
  end if;
  return jsonb_build_object('ok', true, 'state', 'pending');
end;
$$;

grant execute on function public.request_seller_verification () to authenticated;

-- ---------------------------------------------------------------------------
-- admin: app settings
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_app_settings (p_platform_fee_percent numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_platform_fee_percent is null
    or p_platform_fee_percent < 0
    or p_platform_fee_percent > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_fee');
  end if;
  update public.app_settings
  set platform_fee_percent = p_platform_fee_percent, updated_at = now()
  where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_update_app_settings (numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- admin: seller approve / reject
-- ---------------------------------------------------------------------------
create or replace function public.admin_approve_seller (p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.profiles
  set
    seller_verification_status = 'approved',
    seller_decided_at = now(),
    seller_verification_note = null,
    updated_at = now()
  where id = p_user_id and seller_verification_status = 'pending';

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  insert into public.notification_outbox (user_id, type, payload)
  values (p_user_id, 'seller_approved', '{}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_approve_seller (uuid) to authenticated;

create or replace function public.admin_reject_seller (p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.profiles
  set
    seller_verification_status = 'rejected',
    seller_decided_at = now(),
    seller_verification_note = coalesce(nullif(trim(p_reason), ''), 'Rejected'),
    updated_at = now()
  where id = p_user_id and seller_verification_status = 'pending';

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    p_user_id,
    'seller_rejected',
    jsonb_build_object('reason', coalesce(nullif(trim(p_reason), ''), 'Rejected'))
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_reject_seller (uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_auction_featured: clear sort when unfeaturing
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_auction_featured (p_auction_id uuid, p_featured boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.auctions
  set
    is_featured = p_featured,
    featured_sort_order = case when p_featured then featured_sort_order else null end,
    updated_at = now()
  where id = p_auction_id and status = 'active';
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_not_active');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_set_auction_featured_sort_order
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_auction_featured_sort_order (
  p_auction_id uuid,
  p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.auctions
  set featured_sort_order = p_sort_order, updated_at = now()
  where id = p_auction_id and status = 'active' and is_featured = true;

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_not_featured_active');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_auction_featured_sort_order (uuid, integer) to authenticated;
