-- Spotlight collections on the Collections hub; only admins may toggle.

alter table public.seller_collections
  add column if not exists is_featured boolean not null default false;

alter table public.seller_collections
  add column if not exists featured_sort_order integer;

create index if not exists seller_collections_featured_idx
  on public.seller_collections (is_featured, featured_sort_order, created_at desc)
  where is_featured = true;

create or replace function public.enforce_seller_collection_featured_guard ()
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

drop trigger if exists enforce_seller_collection_featured_guard on public.seller_collections;
create trigger enforce_seller_collection_featured_guard
  before insert or update on public.seller_collections
  for each row
  execute function public.enforce_seller_collection_featured_guard ();

create or replace function public.admin_set_seller_collection_featured (
  p_collection_id uuid,
  p_featured boolean
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
  update public.seller_collections
  set
    is_featured = p_featured,
    featured_sort_order = case when p_featured then featured_sort_order else null end,
    updated_at = now()
  where id = p_collection_id;
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_seller_collection_featured (uuid, boolean) to authenticated;

create or replace function public.admin_set_seller_collection_featured_sort_order (
  p_collection_id uuid,
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
  update public.seller_collections
  set featured_sort_order = p_sort_order, updated_at = now()
  where id = p_collection_id and is_featured = true;
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_not_featured');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_seller_collection_featured_sort_order (uuid, integer) to authenticated;

comment on column public.seller_collections.is_featured is
  'Admin-curated spotlight on the Collections hub; sellers cannot set this.';
comment on column public.seller_collections.featured_sort_order is
  'Lower values appear first among featured collections; null sorts last.';
