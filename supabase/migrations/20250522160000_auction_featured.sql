-- Spotlight / home hero: only admins may toggle.
alter table public.auctions
  add column if not exists is_featured boolean not null default false;

create index if not exists auctions_featured_active_idx
  on public.auctions (is_featured, status)
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
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.is_featured is distinct from old.is_featured then
      if coalesce((auth.jwt () ->> 'role'), '') <> 'service_role' and not public.is_admin () then
        new.is_featured := old.is_featured;
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_auction_featured on public.auctions;
drop trigger if exists enforce_auction_featured_insert on public.auctions;
drop trigger if exists enforce_auction_featured_guard on public.auctions;
create trigger enforce_auction_featured_guard
  before insert or update on public.auctions
  for each row
  execute function public.enforce_auction_featured_guard ();

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
  set is_featured = p_featured, updated_at = now()
  where id = p_auction_id and status = 'active';
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_not_active');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_auction_featured (uuid, boolean) to authenticated;
