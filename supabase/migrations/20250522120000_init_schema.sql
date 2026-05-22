-- BIDSTREAM MVP schema
-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.user_role as enum ('buyer', 'seller', 'admin');

create type public.auction_status as enum (
  'draft',
  'pending_approval',
  'active',
  'ended',
  'won',
  'paid',
  'completed',
  'cancelled'
);

create type public.complaint_status as enum ('open', 'reviewing', 'closed');

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Profiles (1:1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  display_name text,
  role public.user_role not null default 'buyer',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_phone_idx on public.profiles (phone);

-- Auctions
create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  status public.auction_status not null default 'draft',
  title text not null,
  description text not null default '',
  location text not null default '',
  terms text not null default '',
  starting_price numeric(14, 2) not null check (starting_price >= 0),
  min_bid_increment numeric(14, 2) not null check (min_bid_increment > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  current_highest_bid numeric(14, 2),
  bid_count integer not null default 0,
  winner_id uuid references public.profiles (id) on delete set null,
  payment_instructions text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auctions_time_chk check (ends_at > starts_at)
);

create index auctions_seller_idx on public.auctions (seller_id);
create index auctions_status_idx on public.auctions (status);
create index auctions_ends_at_idx on public.auctions (ends_at);
create index auctions_category_idx on public.auctions (category_id);

-- Images
create table public.auction_images (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index auction_images_auction_idx on public.auction_images (auction_id, sort_order);

-- Bids (append-only; enforce writes via RPC in production — RLS still allows insert for authenticated with checks)
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index bids_auction_created_idx on public.bids (auction_id, created_at desc);

-- Complaints
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  auction_id uuid references public.auctions (id) on delete set null,
  body text not null,
  status public.complaint_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notification outbox (email worker / Edge Function)
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index notification_outbox_pending_idx on public.notification_outbox (sent_at) where sent_at is null;

-- New user -> profile
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, display_name)
  values (
    new.id,
    new.phone,
    coalesce(new.raw_user_meta_data->>'display_name', 'Bidder')
  )
  on conflict (id) do update
    set phone = excluded.phone,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user ();

-- Keep profile.updated_at fresh
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at ();

create trigger auctions_updated_at before update on public.auctions
  for each row execute function public.set_updated_at ();

create trigger complaints_updated_at before update on public.complaints
  for each row execute function public.set_updated_at ();

-- Realtime
alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;
