-- Featured bid flow: status enum, bid_type, auction columns, supporting tables, read_at on outbox.

-- ---------------------------------------------------------------------------
-- auction_status: new values (idempotent)
-- ---------------------------------------------------------------------------
alter type public.auction_status add value if not exists 'awaiting_payment';
alter type public.auction_status add value if not exists 'awaiting_winner_consent';
alter type public.auction_status add value if not exists 'payment_stage';

-- ---------------------------------------------------------------------------
-- bid_type enum (listing fee tier — distinct from is_featured spotlight flag)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.bid_type as enum ('standard', 'featured');
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------------------
-- auctions: new columns
-- ---------------------------------------------------------------------------
alter table public.auctions
  add column if not exists bid_type public.bid_type not null default 'standard',
  add column if not exists bid_number text,
  add column if not exists communication_code text,
  add column if not exists listing_fee_paid boolean not null default false,
  add column if not exists listing_fee_proof_path text,
  add column if not exists winner_consent_given boolean not null default false,
  add column if not exists winner_contacted_at timestamptz,
  add column if not exists winner_position integer not null default 1,
  add column if not exists seller_phone text,
  add column if not exists winner_contact_phone text;

create unique index if not exists auctions_bid_number_key on public.auctions (bid_number)
  where bid_number is not null;

create unique index if not exists auctions_communication_code_key on public.auctions (communication_code)
  where communication_code is not null;

-- ---------------------------------------------------------------------------
-- notification_outbox.read_at
-- ---------------------------------------------------------------------------
alter table public.notification_outbox
  add column if not exists read_at timestamptz;

-- ---------------------------------------------------------------------------
-- auction_closure_reports
-- ---------------------------------------------------------------------------
create table if not exists public.auction_closure_reports (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  outcome text not null
    constraint auction_closure_reports_outcome_chk
      check (outcome in (
        'completed',
        'cancelled_no_payment',
        'cancelled_terms_disagreement'
      )),
  notes text,
  select_next boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists closure_reports_auction_idx on public.auction_closure_reports (auction_id);

-- ---------------------------------------------------------------------------
-- seller_ratings
-- ---------------------------------------------------------------------------
create table if not exists public.seller_ratings (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null
    constraint seller_ratings_stars_chk check (stars between 1 and 5),
  feedback_type text not null
    constraint seller_ratings_feedback_type_chk
      check (feedback_type in (
        'completed_happy',
        'not_proceed_terms',
        'not_proceed_quality'
      )),
  created_at timestamptz not null default now(),
  unique (auction_id, buyer_id)
);

create index if not exists ratings_seller_idx on public.seller_ratings (seller_id);

-- ---------------------------------------------------------------------------
-- winner_cascade
-- ---------------------------------------------------------------------------
create table if not exists public.winner_cascade (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null,
  notified_at timestamptz not null default now(),
  consented_at timestamptz,
  skipped_at timestamptz,
  closure_outcome text
);

create index if not exists winner_cascade_auction_idx on public.winner_cascade (auction_id, position);

-- ---------------------------------------------------------------------------
-- bid number sequence
-- ---------------------------------------------------------------------------
create sequence if not exists public.bid_number_seq start 10000;

-- ---------------------------------------------------------------------------
-- RLS on new tables
-- ---------------------------------------------------------------------------
alter table public.auction_closure_reports enable row level security;
alter table public.seller_ratings enable row level security;
alter table public.winner_cascade enable row level security;

drop policy if exists closure_reports_select on public.auction_closure_reports;
create policy closure_reports_select on public.auction_closure_reports
  for select using (seller_id = auth.uid () or public.is_admin ());

drop policy if exists closure_reports_insert on public.auction_closure_reports;
create policy closure_reports_insert on public.auction_closure_reports
  for insert with check (seller_id = auth.uid ());

drop policy if exists ratings_select on public.seller_ratings;
create policy ratings_select on public.seller_ratings for select using (true);

drop policy if exists ratings_insert on public.seller_ratings;
create policy ratings_insert on public.seller_ratings
  for insert with check (buyer_id = auth.uid ());

drop policy if exists ratings_update_own on public.seller_ratings;
create policy ratings_update_own on public.seller_ratings
  for update using (buyer_id = auth.uid ()) with check (buyer_id = auth.uid ());

drop policy if exists winner_cascade_select on public.winner_cascade;
create policy winner_cascade_select on public.winner_cascade
  for select using (
    bidder_id = auth.uid ()
    or exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.seller_id = auth.uid ()
    )
    or public.is_admin ()
  );
