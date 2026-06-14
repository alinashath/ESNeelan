-- Fix: profiles_seller_verification_guard must run as SECURITY INVOKER (not DEFINER) so
-- auth.uid() / is_admin() work during admin approve/reject and seller RPC updates.
-- Also apply legacy reset if the previous migration failed mid-way.

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
