-- Seller verification: require documents (no auto-approve); individual = ID photo, business = registration.

-- ---------------------------------------------------------------------------
-- profiles: verification document storage paths (private bucket)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists seller_verification_id_document_path text,
  add column if not exists seller_verification_business_reg_path text;

-- ---------------------------------------------------------------------------
-- Reset legacy auto-approved sellers (run with trigger disabled — approved→none
-- is otherwise blocked by profiles_seller_verification_guard)
-- ---------------------------------------------------------------------------
alter table public.profiles disable trigger profiles_seller_verification_guard;

update public.profiles p
set
  seller_verification_status = 'none',
  seller_decided_at = null,
  seller_applied_at = null,
  seller_verification_note = null,
  seller_verification_id_document_path = null,
  seller_verification_business_reg_path = null,
  updated_at = now()
where p.seller_verification_status = 'approved'
  and p.seller_applied_at is null
  and p.role is distinct from 'admin'::public.user_role;

alter table public.profiles enable trigger profiles_seller_verification_guard;
-- ---------------------------------------------------------------------------
-- Storage: seller verification documents (seller uploads; admin reads)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('seller-verification-docs', 'seller-verification-docs', false)
on conflict (id) do nothing;

drop policy if exists seller_verification_docs_insert on storage.objects;
create policy seller_verification_docs_insert on storage.objects
  for insert
  with check (
    bucket_id = 'seller-verification-docs'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) = auth.uid ()::text
  );

drop policy if exists seller_verification_docs_select on storage.objects;
create policy seller_verification_docs_select on storage.objects
  for select
  using (
    bucket_id = 'seller-verification-docs'
    and (
      public.is_admin ()
      or (
        auth.role () = 'authenticated'
        and split_part(name, '/', 1) = auth.uid ()::text
      )
    )
  );

drop policy if exists seller_verification_docs_update on storage.objects;
create policy seller_verification_docs_update on storage.objects
  for update
  using (
    bucket_id = 'seller-verification-docs'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) = auth.uid ()::text
  );

drop policy if exists seller_verification_docs_delete on storage.objects;
create policy seller_verification_docs_delete on storage.objects
  for delete
  using (
    bucket_id = 'seller-verification-docs'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) = auth.uid ()::text
  );

-- ---------------------------------------------------------------------------
-- profiles_seller_verification_guard: block direct document-only edits
-- ---------------------------------------------------------------------------
create or replace function public.profiles_seller_verification_guard ()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_jwt_role text := coalesce(auth.jwt () ->> 'role', '');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if v_jwt_role is distinct from 'service_role' and not public.is_admin () then
    if (
      new.seller_verification_id_document_path is distinct from old.seller_verification_id_document_path
      or new.seller_verification_business_reg_path is distinct from old.seller_verification_business_reg_path
    ) then
      if not (
        new.seller_verification_status = 'pending'
        and old.seller_verification_status in ('none', 'rejected')
        and new.seller_verification_status is distinct from old.seller_verification_status
      ) then
        raise exception 'forbidden_verification_document_edit';
      end if;
    end if;
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

-- ---------------------------------------------------------------------------
-- request_seller_verification: requires document path(s) by account_type
-- ---------------------------------------------------------------------------
drop function if exists public.request_seller_verification ();

create or replace function public.request_seller_verification (
  p_id_document_path text,
  p_business_registration_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid ();
  v_sv text;
  v_acct text;
  v_id text := nullif(trim(coalesce(p_id_document_path, '')), '');
  v_bus text := nullif(trim(coalesce(p_business_registration_path, '')), '');
  n int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select seller_verification_status, account_type::text
  into v_sv, v_acct
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

  if v_acct = 'individual' then
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'id_document_required');
    end if;
    if v_id not like (v_uid::text || '/%') then
      return jsonb_build_object('ok', false, 'error', 'invalid_id_document_path');
    end if;
    v_bus := null;
  elsif v_acct = 'business' then
    if v_bus is null then
      return jsonb_build_object('ok', false, 'error', 'business_registration_required');
    end if;
    if v_bus not like (v_uid::text || '/%') then
      return jsonb_build_object('ok', false, 'error', 'invalid_business_registration_path');
    end if;
    v_id := null;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_account_type');
  end if;

  update public.profiles
  set
    seller_verification_status = 'pending',
    seller_applied_at = now(),
    seller_decided_at = null,
    seller_verification_note = null,
    seller_verification_id_document_path = v_id,
    seller_verification_business_reg_path = v_bus,
    updated_at = now()
  where id = v_uid and seller_verification_status in ('none', 'rejected');

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_state');
  end if;
  return jsonb_build_object('ok', true, 'state', 'pending');
end;
$$;

grant execute on function public.request_seller_verification (text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin approve / reject: clear stored document paths
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
    seller_verification_id_document_path = null,
    seller_verification_business_reg_path = null,
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
    seller_verification_id_document_path = null,
    seller_verification_business_reg_path = null,
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
