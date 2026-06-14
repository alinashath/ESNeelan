-- Admin: revoke seller verification (approved → none) for a non-admin user.

create or replace function public.admin_revoke_seller_verification (p_user_id uuid)
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
    seller_verification_status = 'none',
    seller_applied_at = null,
    seller_decided_at = null,
    seller_verification_note = null,
    seller_verification_id_document_path = null,
    seller_verification_business_reg_path = null,
    updated_at = now()
  where id = p_user_id
    and seller_verification_status = 'approved'
    and role is distinct from 'admin'::public.user_role;

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_approved_or_is_admin');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_revoke_seller_verification (uuid) to authenticated;
