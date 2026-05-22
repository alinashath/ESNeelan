-- Categories for MVP browse / filters
insert into public.categories (name, slug)
values
  ('All', 'all'),
  ('Electronics', 'electronics'),
  ('Fashion', 'fashion'),
  ('Art', 'art'),
  ('Home', 'home'),
  ('Sports', 'sports')
on conflict (slug) do nothing;
