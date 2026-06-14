-- Hierarchical categories + many-to-many auction ↔ category
-- Ecosystem: 'curated' = seeded ecommerce tree; 'legacy' = older MVP rows (still valid FKs).

alter table public.categories
  add column if not exists parent_id uuid references public.categories (id) on delete set null,
  add column if not exists sort_order integer not null default 0,
  add column if not exists ecosystem text not null default 'legacy';

create index if not exists categories_parent_idx on public.categories (parent_id);
create index if not exists categories_ecosystem_idx on public.categories (ecosystem);

create table if not exists public.auction_categories (
  auction_id uuid not null references public.auctions (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (auction_id, category_id)
);

create index if not exists auction_categories_category_idx
  on public.auction_categories (category_id);

-- Backfill links from legacy single category_id
insert into public.auction_categories (auction_id, category_id, sort_order)
select a.id, a.category_id, 0
from public.auctions a
where a.category_id is not null
on conflict (auction_id, category_id) do nothing;

alter table public.auction_categories enable row level security;

drop policy if exists auction_categories_select on public.auction_categories;
create policy auction_categories_select on public.auction_categories for select using (
  exists (
    select 1
    from public.auctions a
    where a.id = auction_categories.auction_id
      and (
        public.is_admin ()
        or a.seller_id = auth.uid ()
        or (
          a.status in ('active', 'ended', 'won', 'paid', 'completed')
          and not public.profile_is_suspended (a.seller_id)
        )
      )
  )
);

drop policy if exists auction_categories_insert on public.auction_categories;
create policy auction_categories_insert on public.auction_categories for insert with check (
  exists (
    select 1
    from public.auctions a
    where a.id = auction_categories.auction_id
      and a.seller_id = auth.uid ()
      and a.status = 'draft'
  )
);

drop policy if exists auction_categories_delete on public.auction_categories;
create policy auction_categories_delete on public.auction_categories for delete using (
  exists (
    select 1
    from public.auctions a
    where a.id = auction_categories.auction_id
      and a.seller_id = auth.uid ()
      and a.status = 'draft'
  )
);
