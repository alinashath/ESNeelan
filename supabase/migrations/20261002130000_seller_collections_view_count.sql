-- Track public views for Events hub / home ranking.

alter table public.seller_collections
  add column if not exists view_count integer not null default 0;

create index if not exists seller_collections_view_count_idx
  on public.seller_collections (view_count desc, created_at desc);

comment on column public.seller_collections.view_count is
  'Public detail-page opens; used to rank Events on home.';

create or replace function public.increment_seller_collection_view (p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.seller_collections
  set view_count = view_count + 1
  where id = p_collection_id
    and not public.profile_is_suspended (seller_id);
end;
$$;

revoke all on function public.increment_seller_collection_view (uuid) from public;
grant execute on function public.increment_seller_collection_view (uuid) to anon, authenticated;
