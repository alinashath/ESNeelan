-- One-off data cleanup: remove auctions and related content; keep auth.users + profiles.
-- Storage objects must be removed via Storage API (direct DELETE on storage.objects is blocked).
-- Run against linked remote via Dashboard SQL editor or psql.

begin;

-- Seller storefront groupings
delete from public.seller_collections;

-- Editorial articles
delete from public.featured_articles;

-- Support / messaging tied to listings
delete from public.complaints;
delete from public.notification_outbox;

-- Auction graph (cascades bids, images, categories, ratings, cascade rows, closure reports, collection items)
delete from public.auctions;

-- Reset listing number sequence for a clean slate
alter sequence if exists public.bid_number_seq restart with 10000;

commit;
