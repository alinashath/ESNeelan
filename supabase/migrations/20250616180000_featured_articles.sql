-- Featured editorial articles (admin-authored; public read when published).

create type public.featured_article_status as enum ('draft', 'published');

create table public.featured_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text not null default '',
  cover_image_url text,
  blocks jsonb not null default '[]'::jsonb,
  status public.featured_article_status not null default 'draft',
  published_at timestamptz,
  home_sort_order integer not null default 0,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_articles_slug_unique unique (slug),
  constraint featured_articles_slug_len_chk check (char_length(slug) between 1 and 200),
  constraint featured_articles_home_sort_chk check (home_sort_order >= 0 and home_sort_order <= 1000000)
);

create index featured_articles_status_published_idx
  on public.featured_articles (status, published_at desc nulls last)
  where status = 'published';

create index featured_articles_home_order_idx
  on public.featured_articles (home_sort_order, published_at desc nulls last)
  where status = 'published';

create trigger featured_articles_updated_at
  before update on public.featured_articles
  for each row execute function public.set_updated_at ();

alter table public.featured_articles enable row level security;

drop policy if exists featured_articles_select on public.featured_articles;
create policy featured_articles_select on public.featured_articles for select using (
  public.is_admin ()
  or (
    status = 'published'
    and published_at is not null
    and published_at <= timezone('utc', now())
  )
);

drop policy if exists featured_articles_insert on public.featured_articles;
create policy featured_articles_insert on public.featured_articles for insert with check (
  public.is_admin ()
  and created_by = auth.uid ()
);

drop policy if exists featured_articles_update on public.featured_articles;
create policy featured_articles_update on public.featured_articles for update using (public.is_admin ())
with check (public.is_admin ());

drop policy if exists featured_articles_delete on public.featured_articles;
create policy featured_articles_delete on public.featured_articles for delete using (public.is_admin ());

grant select on public.featured_articles to anon, authenticated;
grant insert, update, delete on public.featured_articles to authenticated;
