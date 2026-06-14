-- Fix infinite RLS recursion on profiles: policies must not subquery public.profiles
-- from within profiles policies (re-enters RLS). Use a SECURITY DEFINER helper instead.
-- Extend profiles for avatar, account type, contact email, location, address.

create or replace function public.profile_is_suspended (p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_id
      and p.suspended_at is not null
  );
$$;

revoke all on function public.profile_is_suspended (uuid) from public;
grant execute on function public.profile_is_suspended (uuid) to authenticated, anon, service_role;

-- Extended profile fields
alter table public.profiles
  add column if not exists avatar_storage_path text,
  add column if not exists account_type text not null default 'individual'
    check (account_type in ('individual', 'business')),
  add column if not exists contact_email text,
  add column if not exists location_text text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists postal_code text;

comment on column public.profiles.avatar_storage_path is 'Path in storage bucket avatars/{userId}/...';
comment on column public.profiles.account_type is 'individual | business';
comment on column public.profiles.contact_email is 'Optional contact email (not auth email)';
comment on column public.profiles.location_text is 'Optional area / island / region';

-- Replace policies that nested-select profiles (causes recursion)
drop policy if exists profiles_select_as_seller on public.profiles;
create policy profiles_select_as_seller on public.profiles for select using (
  exists (
    select 1
    from public.auctions a
    where a.seller_id = profiles.id
      and a.status in ('active', 'ended', 'won', 'paid', 'completed')
      and not public.profile_is_suspended (a.seller_id)
  )
);

drop policy if exists profiles_visible_via_public_bids on public.profiles;
create policy profiles_visible_via_public_bids on public.profiles for select using (
  exists (
    select 1
    from public.bids b
    join public.auctions a on a.id = b.auction_id
    where b.bidder_id = profiles.id
      and a.status in ('active', 'ended', 'won', 'paid', 'completed')
      and not public.profile_is_suspended (a.seller_id)
  )
);

drop policy if exists auctions_select on public.auctions;
create policy auctions_select on public.auctions for select using (
  public.is_admin ()
  or seller_id = auth.uid ()
  or (
    status in ('active', 'ended', 'won', 'paid', 'completed')
    and not public.profile_is_suspended (auctions.seller_id)
  )
);

-- Public avatar bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername (name))[1] = auth.uid ()::text
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername (name))[1] = auth.uid ()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername (name))[1] = auth.uid ()::text
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername (name))[1] = auth.uid ()::text
);
