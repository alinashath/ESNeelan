-- Seller-curated collections (optional): name, description, cover image; auctions linked via junction.

create table public.seller_collections (
  id uuid primary key default gen_random_uuid (),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_collections_name_nonempty check (char_length (trim(name)) > 0)
);

create index seller_collections_seller_idx on public.seller_collections (seller_id, created_at desc);

create trigger seller_collections_updated_at before update on public.seller_collections
for each row execute function public.set_updated_at ();

comment on table public.seller_collections is
  'Optional seller-defined groupings of their auctions for storefront display.';
comment on column public.seller_collections.cover_storage_path is
  'Object path in seller-collection-covers bucket; public URL via storage.';

create table public.seller_collection_items (
  collection_id uuid not null references public.seller_collections (id) on delete cascade,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, auction_id)
);

create index seller_collection_items_auction_idx on public.seller_collection_items (auction_id);

-- RLS
alter table public.seller_collections enable row level security;
alter table public.seller_collection_items enable row level security;

-- Collections: sellers manage own; others read if seller is not suspended (storefront / discovery).
create policy seller_collections_select on public.seller_collections for select using (
  public.is_admin ()
  or seller_id = auth.uid ()
  or not public.profile_is_suspended (seller_id)
);

create policy seller_collections_insert on public.seller_collections for insert with check (
  seller_id = auth.uid ()
);

create policy seller_collections_update on public.seller_collections for update using (
  seller_id = auth.uid ()
)
with check (seller_id = auth.uid ());

create policy seller_collections_delete on public.seller_collections for delete using (seller_id = auth.uid ());

-- Items: owner sees all rows in their collections; public sees rows only for publicly visible auctions.
create policy seller_collection_items_select on public.seller_collection_items for select using (
  public.is_admin ()
  or exists (
    select 1
    from public.seller_collections c
    where c.id = seller_collection_items.collection_id
      and c.seller_id = auth.uid ()
  )
  or exists (
    select 1
    from public.seller_collections c
    join public.auctions a on a.id = seller_collection_items.auction_id
    where c.id = seller_collection_items.collection_id
      and a.seller_id = c.seller_id
      and a.status in (
        'active',
        'ended',
        'won',
        'paid',
        'completed',
        'awaiting_winner_consent',
        'payment_stage'
      )
      and not public.profile_is_suspended (c.seller_id)
  )
);

create policy seller_collection_items_insert on public.seller_collection_items for insert with check (
  exists (
    select 1
    from public.seller_collections c
    join public.auctions a on a.id = seller_collection_items.auction_id
    where c.id = seller_collection_items.collection_id
      and c.seller_id = auth.uid ()
      and a.seller_id = auth.uid ()
  )
);

create policy seller_collection_items_delete on public.seller_collection_items for delete using (
  exists (
    select 1
    from public.seller_collections c
    where c.id = seller_collection_items.collection_id
      and c.seller_id = auth.uid ()
  )
);

create policy seller_collection_items_update on public.seller_collection_items for update using (
  exists (
    select 1
    from public.seller_collections c
    where c.id = seller_collection_items.collection_id
      and c.seller_id = auth.uid ()
  )
)
with check (
  exists (
    select 1
    from public.seller_collections c
    join public.auctions a on a.id = seller_collection_items.auction_id
    where c.id = seller_collection_items.collection_id
      and c.seller_id = auth.uid ()
      and a.seller_id = auth.uid ()
  )
);

-- Storage: path convention {collection_id}/{filename}
insert into storage.buckets (id, name, public)
values ('seller-collection-covers', 'seller-collection-covers', true)
on conflict (id) do nothing;

drop policy if exists seller_collection_covers_public_read on storage.objects;
create policy seller_collection_covers_public_read on storage.objects for select
  using (bucket_id = 'seller-collection-covers');

drop policy if exists seller_collection_covers_owner_insert on storage.objects;
create policy seller_collection_covers_owner_insert on storage.objects for insert
  with check (
    bucket_id = 'seller-collection-covers'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select sc.id::text
      from public.seller_collections sc
      where sc.seller_id = auth.uid ()
    )
  );

drop policy if exists seller_collection_covers_owner_update on storage.objects;
create policy seller_collection_covers_owner_update on storage.objects for update
  using (
    bucket_id = 'seller-collection-covers'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select sc.id::text
      from public.seller_collections sc
      where sc.seller_id = auth.uid ()
    )
  )
  with check (
    bucket_id = 'seller-collection-covers'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select sc.id::text
      from public.seller_collections sc
      where sc.seller_id = auth.uid ()
    )
  );

drop policy if exists seller_collection_covers_owner_delete on storage.objects;
create policy seller_collection_covers_owner_delete on storage.objects for delete
  using (
    bucket_id = 'seller-collection-covers'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select sc.id::text
      from public.seller_collections sc
      where sc.seller_id = auth.uid ()
    )
  );
