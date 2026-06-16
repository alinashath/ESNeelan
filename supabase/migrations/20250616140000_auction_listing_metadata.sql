-- Structured listing metadata: condition, delivery choices, category-shaped attributes (JSON).

alter table public.auctions
  add column if not exists item_condition text not null default 'new'
    check (
      item_condition in (
        'new',
        'like_new',
        'used_excellent',
        'used_good',
        'used_fair',
        'for_parts'
      )
    );

alter table public.auctions
  add column if not exists delivery_options text[] not null default '{}'::text[];

alter table public.auctions
  add column if not exists listing_attributes jsonb not null default '{}'::jsonb;

comment on column public.auctions.item_condition is 'Physical condition label for the item (seller-selected).';
comment on column public.auctions.delivery_options is 'Subset of app-defined delivery method slugs (text array).';
comment on column public.auctions.listing_attributes is 'Category-driven structured fields (dimensions, tags, etc.); shape enforced in the app.';
