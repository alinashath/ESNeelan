-- Featured listing fee: admin-configurable bank details + active-listing upgrade requests.

-- ---------------------------------------------------------------------------
-- app_settings: featured fee (MVR amount + payee)
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists featured_listing_fee_amount numeric(12, 2) not null default 150
    check (featured_listing_fee_amount >= 0),
  add column if not exists featured_listing_fee_account_number text not null default '7730000000000',
  add column if not exists featured_listing_fee_account_name text not null default 'Feridhoo Holdings';

update public.app_settings
set
  featured_listing_fee_account_number = trim(featured_listing_fee_account_number),
  featured_listing_fee_account_name = trim(featured_listing_fee_account_name)
where id = 1;

-- ---------------------------------------------------------------------------
-- auctions: seller requested featured fee while listing stays live
-- ---------------------------------------------------------------------------
alter table public.auctions
  add column if not exists featured_listing_fee_pending boolean not null default false;

-- ---------------------------------------------------------------------------
-- admin_update_app_settings: platform fee + featured fee payee
-- ---------------------------------------------------------------------------
drop function if exists public.admin_update_app_settings (numeric);

create or replace function public.admin_update_app_settings (
  p_platform_fee_percent numeric,
  p_featured_listing_fee_amount numeric,
  p_featured_listing_fee_account_number text,
  p_featured_listing_fee_account_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acct text := trim(coalesce(p_featured_listing_fee_account_number, ''));
  v_name text := trim(coalesce(p_featured_listing_fee_account_name, ''));
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_platform_fee_percent is null
    or p_platform_fee_percent < 0
    or p_platform_fee_percent > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_fee');
  end if;
  if p_featured_listing_fee_amount is null or p_featured_listing_fee_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_featured_amount');
  end if;
  if v_acct = '' or v_name = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_featured_payee');
  end if;

  update public.app_settings
  set
    platform_fee_percent = p_platform_fee_percent,
    featured_listing_fee_amount = p_featured_listing_fee_amount,
    featured_listing_fee_account_number = v_acct,
    featured_listing_fee_account_name = v_name,
    updated_at = now()
  where id = 1;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_update_app_settings (numeric, numeric, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_request_featured_listing_fee
-- draft + standard -> bid_type featured (seller uploads fee proof before submit)
-- active + standard -> pending flag (listing stays live until admin verifies)
-- ---------------------------------------------------------------------------
create or replace function public.seller_request_featured_listing_fee (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid ();
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
  if v.status not in ('draft', 'active') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  if v.bid_type is distinct from 'standard' then
    return jsonb_build_object('ok', false, 'error', 'already_featured_tier');
  end if;

  if v.status = 'draft' then
    update public.auctions
    set
      bid_type = 'featured',
      listing_fee_paid = false,
      listing_fee_proof_path = null,
      featured_listing_fee_pending = false,
      updated_at = now()
    where id = p_auction_id;
    return jsonb_build_object('ok', true, 'mode', 'draft_featured');
  end if;

  -- active
  if coalesce(v.featured_listing_fee_pending, false) then
    return jsonb_build_object('ok', true, 'mode', 'active_already_pending');
  end if;

  update public.auctions
  set
    featured_listing_fee_pending = true,
    listing_fee_paid = false,
    listing_fee_proof_path = null,
    updated_at = now()
  where id = p_auction_id;

  return jsonb_build_object('ok', true, 'mode', 'active_pending_fee');
end;
$$;

grant execute on function public.seller_request_featured_listing_fee (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_set_featured_listing_fee_proof: draft featured OR active fee pending
-- ---------------------------------------------------------------------------
create or replace function public.seller_set_featured_listing_fee_proof (
  p_auction_id uuid,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid ();
  v public.auctions;
  v_path text := trim(coalesce(p_storage_path, ''));
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_path = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_path');
  end if;

  select * into v from public.auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v.seller_id <> v_seller then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_path not like (v.id::text || '/%') then
    return jsonb_build_object('ok', false, 'error', 'invalid_path_prefix');
  end if;

  if v.status = 'draft' and v.bid_type = 'featured' then
    update public.auctions
    set listing_fee_proof_path = v_path, updated_at = now()
    where id = p_auction_id;
    return jsonb_build_object('ok', true);
  end if;

  if v.status = 'active' and coalesce(v.featured_listing_fee_pending, false) then
    update public.auctions
    set listing_fee_proof_path = v_path, updated_at = now()
    where id = p_auction_id;
    return jsonb_build_object('ok', true);
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_state');
end;
$$;

grant execute on function public.seller_set_featured_listing_fee_proof (uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_verify_featured_listing_fee_active: standard + pending -> featured tier
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_featured_listing_fee_active (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_seller uuid;
  v_title text;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.auctions
  set
    bid_type = 'featured',
    listing_fee_paid = true,
    featured_listing_fee_pending = false,
    updated_at = now()
  where id = p_auction_id
    and status = 'active'
    and bid_type = 'standard'
    and coalesce(featured_listing_fee_pending, false) = true
    and coalesce(listing_fee_proof_path, '') <> '';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_invalid');
  end if;

  select seller_id, title into v_seller, v_title
  from public.auctions
  where id = p_auction_id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_seller,
    'featured_listing_fee_verified',
    jsonb_build_object('auction_id', p_auction_id, 'title', v_title)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_verify_featured_listing_fee_active (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_reject_auction: cancel pending/awaiting OR clear active featured-fee request
-- ---------------------------------------------------------------------------
create or replace function public.admin_reject_auction (p_auction_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
  v_status public.auction_status;
  v_pending boolean;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select
    seller_id,
    title,
    status,
    coalesce(featured_listing_fee_pending, false)
  into v_seller, v_title, v_status, v_pending
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_status in ('pending_approval', 'awaiting_payment') then
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
      jsonb_build_object(
        'auction_id', p_auction_id,
        'title', v_title,
        'reason', p_reason
      )
    );

    return jsonb_build_object('ok', true);
  end if;

  if v_status = 'active' and v_pending then
    update public.auctions
    set
      featured_listing_fee_pending = false,
      listing_fee_proof_path = null,
      listing_fee_paid = false,
      updated_at = now()
    where id = p_auction_id;

    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_seller,
      'featured_fee_request_rejected',
      jsonb_build_object(
        'auction_id', p_auction_id,
        'title', v_title,
        'reason', coalesce(nullif(trim(p_reason), ''), 'Payment proof not accepted')
      )
    );

    return jsonb_build_object('ok', true);
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid_transition');
end;
$$;
