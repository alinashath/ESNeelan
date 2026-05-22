-- Prevent authenticated users from changing their own role via PostgREST (admin promotion uses service_role).
create or replace function public.enforce_profile_role_locked ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce((auth.jwt () ->> 'role'), '') <> 'service_role' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role on public.profiles;
create trigger enforce_profile_role
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_locked ();
