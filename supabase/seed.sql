-- Categories: base rows for local `supabase db reset` (optional).
-- The curated ecommerce tree is created by migration `20250522150001_seed_curated_categories.sql`.
insert into public.categories (name, slug)
values
  ('All', 'all'),
  ('Electronics', 'electronics'),
  ('Fashion', 'fashion'),
  ('Art', 'art'),
  ('Home', 'home'),
  ('Sports', 'sports')
on conflict (slug) do nothing;
