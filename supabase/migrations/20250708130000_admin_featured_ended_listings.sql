-- Admin can unfeature ended/sold listings; auto-clear spotlight when a lot leaves active.

-- One-time cleanup: spotlight is for live home carousel only.
update public.auctions
set
  is_featured = false,
  featured_sort_order = null,
  updated_at = now()
where is_featured = true
  and status <> 'active';

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
    if old.status = 'active' and new.status is distinct from 'active' and new.is_featured then
      new.is_featured := false;
      new.featured_sort_order := null;
    end if;

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

  if p_featured then
    update public.auctions
    set
      is_featured = true,
      updated_at = now()
    where id = p_auction_id and status = 'active';
    get diagnostics n = row_count;
    if n = 0 then
      return jsonb_build_object('ok', false, 'error', 'not_found_or_not_active');
    end if;
  else
    update public.auctions
    set
      is_featured = false,
      featured_sort_order = null,
      updated_at = now()
    where id = p_auction_id;
    get diagnostics n = row_count;
    if n = 0 then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
