-- Allow admins to approve seller verification from pending, none, or rejected
-- (manual grant when no queue entry, or after offline review).

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
  where id = p_user_id
    and seller_verification_status in ('pending', 'none', 'rejected')
    and role is distinct from 'admin'::public.user_role;

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_state');
  end if;

  insert into public.notification_outbox (user_id, type, payload)
  values (p_user_id, 'seller_approved', '{}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;
