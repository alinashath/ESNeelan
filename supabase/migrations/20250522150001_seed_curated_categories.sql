-- Curated ecommerce category tree (ecosystem = 'curated'). Slugs are globally unique.

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
values
  ('Electronics', 'ec-electronics', null, 10, 'curated'),
  ('Fashion & Apparel', 'ec-fashion', null, 20, 'curated'),
  ('Home, Kitchen & Dining', 'ec-home', null, 30, 'curated'),
  ('Health, Beauty & Personal Care', 'ec-health', null, 40, 'curated'),
  ('Sports & Outdoors', 'ec-sports', null, 50, 'curated'),
  ('Toys & Games', 'ec-toys', null, 60, 'curated'),
  ('Automotive & Industrial', 'ec-auto', null, 70, 'curated'),
  ('Books, Movies & Music', 'ec-media', null, 80, 'curated'),
  ('Baby & Kids', 'ec-baby', null, 90, 'curated'),
  ('Pet Supplies', 'ec-pets', null, 100, 'curated'),
  ('Garden & Outdoor', 'ec-garden', null, 110, 'curated'),
  ('Tools & Home Improvement', 'ec-tools', null, 120, 'curated'),
  ('Art, Craft & Sewing', 'ec-art', null, 130, 'curated'),
  ('Jewelry & Watches', 'ec-jewelry', null, 140, 'curated'),
  ('Office & School', 'ec-office', null, 150, 'curated'),
  ('Food & Beverages', 'ec-food', null, 160, 'curated'),
  ('Software & Digital', 'ec-software', null, 170, 'curated'),
  ('Collectibles', 'ec-collectibles', null, 180, 'curated'),
  ('Business & Scientific', 'ec-business', null, 190, 'curated'),
  ('Miscellaneous', 'ec-misc', null, 200, 'curated')
on conflict (slug) do update
set
  name = excluded.name,
  ecosystem = excluded.ecosystem,
  sort_order = excluded.sort_order,
  parent_id = coalesce (public.categories.parent_id, excluded.parent_id);

-- Electronics children
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Smartphones & Accessories', 'ec-electronics-phones', 1),
    ('Computers & Tablets', 'ec-electronics-computers', 2),
    ('TV, Audio & Video', 'ec-electronics-tv', 3),
    ('Cameras & Drones', 'ec-electronics-cameras', 4),
    ('Wearables', 'ec-electronics-wearables', 5),
    ('Gaming Hardware', 'ec-electronics-gaming', 6)
) as v (name, slug, ord)
where c.slug = 'ec-electronics'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Fashion children
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Women', 'ec-fashion-women', 1),
    ('Men', 'ec-fashion-men', 2),
    ('Kids', 'ec-fashion-kids', 3),
    ('Shoes', 'ec-fashion-shoes', 4),
    ('Bags & Accessories', 'ec-fashion-bags', 5)
) as v (name, slug, ord)
where c.slug = 'ec-fashion'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Home children
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Furniture', 'ec-home-furniture', 1),
    ('Bedding & Bath', 'ec-home-bedding', 2),
    ('Kitchen & Dining', 'ec-home-kitchen', 3),
    ('Home Décor', 'ec-home-decor', 4),
    ('Storage & Organization', 'ec-home-storage', 5)
) as v (name, slug, ord)
where c.slug = 'ec-home'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Health children
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Skincare', 'ec-health-skin', 1),
    ('Haircare', 'ec-health-hair', 2),
    ('Vitamins & Supplements', 'ec-health-vitamins', 3),
    ('Personal Care Appliances', 'ec-health-appliances', 4)
) as v (name, slug, ord)
where c.slug = 'ec-health'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Sports children
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Fitness', 'ec-sports-fitness', 1),
    ('Team Sports', 'ec-sports-team', 2),
    ('Outdoor Recreation', 'ec-sports-outdoor', 3),
    ('Cycling', 'ec-sports-cycling', 4)
) as v (name, slug, ord)
where c.slug = 'ec-sports'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Toys children
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Action Figures & Dolls', 'ec-toys-figures', 1),
    ('Board Games & Puzzles', 'ec-toys-games', 2),
    ('Educational Toys', 'ec-toys-edu', 3),
    ('Outdoor Play', 'ec-toys-outdoor', 4)
) as v (name, slug, ord)
where c.slug = 'ec-toys'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Remaining roots: shallow children (2 each) for browse depth
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Parts', 'ec-auto-parts', 1),
    ('Accessories', 'ec-auto-accessories', 2)
) as v (name, slug, ord)
where c.slug = 'ec-auto'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Books', 'ec-media-books', 1),
    ('Movies & TV', 'ec-media-movies', 2)
) as v (name, slug, ord)
where c.slug = 'ec-media'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Nursery', 'ec-baby-nursery', 1),
    ('Feeding', 'ec-baby-feeding', 2)
) as v (name, slug, ord)
where c.slug = 'ec-baby'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Dog Supplies', 'ec-pets-dog', 1),
    ('Cat Supplies', 'ec-pets-cat', 2)
) as v (name, slug, ord)
where c.slug = 'ec-pets'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Plants & Seeds', 'ec-garden-plants', 1),
    ('Outdoor Furniture', 'ec-garden-furniture', 2)
) as v (name, slug, ord)
where c.slug = 'ec-garden'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Power Tools', 'ec-tools-power', 1),
    ('Hand Tools', 'ec-tools-hand', 2)
) as v (name, slug, ord)
where c.slug = 'ec-tools'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Fine Jewelry', 'ec-jewelry-fine', 1),
    ('Fashion Jewelry', 'ec-jewelry-fashion', 2)
) as v (name, slug, ord)
where c.slug = 'ec-jewelry'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Writing Supplies', 'ec-office-writing', 1),
    ('Paper & Notebooks', 'ec-office-paper', 2)
) as v (name, slug, ord)
where c.slug = 'ec-office'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Snacks', 'ec-food-snacks', 1),
    ('Beverages', 'ec-food-drinks', 2)
) as v (name, slug, ord)
where c.slug = 'ec-food'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Games', 'ec-software-games', 1),
    ('Productivity', 'ec-software-productivity', 2)
) as v (name, slug, ord)
where c.slug = 'ec-software'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Trading Cards', 'ec-collectibles-cards', 1),
    ('Vintage', 'ec-collectibles-vintage', 2)
) as v (name, slug, ord)
where c.slug = 'ec-collectibles'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Office Furniture', 'ec-business-office', 1),
    ('Lab & Scientific', 'ec-business-lab', 2)
) as v (name, slug, ord)
where c.slug = 'ec-business'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('General', 'ec-misc-general', 1),
    ('Bundles', 'ec-misc-bundles', 2)
) as v (name, slug, ord)
where c.slug = 'ec-misc'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';

-- Art root children (root ec-art was "Art, Craft & Sewing")
insert into public.categories (name, slug, parent_id, sort_order, ecosystem)
select v.name, v.slug, c.id, v.ord, 'curated'
from public.categories c
cross join (
  values
    ('Painting & Drawing', 'ec-art-paint', 1),
    ('Yarn & Fabric', 'ec-art-fabric', 2)
) as v (name, slug, ord)
where c.slug = 'ec-art'
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, ecosystem = 'curated';
