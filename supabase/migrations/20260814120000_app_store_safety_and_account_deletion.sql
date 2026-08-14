-- App Store guideline 1.2: reports, user blocking, and server-side text filtering.
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  auction_id uuid references public.auctions (id) on delete set null,
  reason text not null default 'Abusive or objectionable content',
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);
drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own on public.user_blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id);
drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

-- Extend reports with the abusive account, category and 24-hour response target.
alter table public.complaints
  add column if not exists reported_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists category text not null default 'other',
  add column if not exists review_due_at timestamptz not null default (now() + interval '24 hours');

create index if not exists complaints_open_due_idx
  on public.complaints (review_due_at) where status <> 'closed';

-- Blocking also files a developer-visible complaint in one atomic call.
create or replace function public.block_and_report_user(
  p_blocked_id uuid,
  p_auction_id uuid,
  p_category text,
  p_body text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if p_blocked_id = (select auth.uid()) then raise exception 'cannot_block_self'; end if;
  if not exists (select 1 from public.auctions where id = p_auction_id and seller_id = p_blocked_id) then
    raise exception 'listing_user_mismatch';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id, auction_id, reason)
  values ((select auth.uid()), p_blocked_id, p_auction_id, left(coalesce(nullif(trim(p_body), ''), p_category), 1000))
  on conflict (blocker_id, blocked_id) do update
    set auction_id = excluded.auction_id, reason = excluded.reason, created_at = now();

  insert into public.complaints (reporter_id, auction_id, reported_user_id, category, body)
  values ((select auth.uid()), p_auction_id, p_blocked_id, left(p_category, 40), left(coalesce(nullif(trim(p_body), ''), p_category), 2000));
end;
$$;
grant execute on function public.block_and_report_user(uuid, uuid, text, text) to authenticated;

-- A blocked seller's listings disappear immediately from the blocker's catalog/detail queries.
create or replace function public.current_user_blocks_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks b
    where b.blocker_id = (select auth.uid())
      and b.blocked_id = p_profile_id
  );
$$;
revoke all on function public.current_user_blocks_profile(uuid) from public;
grant execute on function public.current_user_blocks_profile(uuid) to anon, authenticated, service_role;

drop policy if exists auctions_select on public.auctions;
create policy auctions_select on public.auctions for select using (
  public.is_admin()
  or seller_id = (select auth.uid())
  or (
    status in ('active', 'ended', 'won', 'paid', 'completed', 'awaiting_winner_consent', 'payment_stage')
    and not public.profile_is_suspended(auctions.seller_id)
    and not public.current_user_blocks_profile(auctions.seller_id)
  )
);

-- Reject common high-severity objectionable terms before a listing can be stored.
create or replace function public.reject_objectionable_listing_text() returns trigger
language plpgsql
set search_path = public
as $$
declare combined text := lower(concat_ws(' ', new.title, new.description, new.terms));
begin
  if combined ~ '(child sexual|sexual abuse|rape threat|kill yourself|racial slur)' then
    raise exception 'listing_contains_objectionable_content';
  end if;
  return new;
end;
$$;
drop trigger if exists auctions_filter_objectionable_text on public.auctions;
create trigger auctions_filter_objectionable_text before insert or update of title, description, terms
on public.auctions for each row execute function public.reject_objectionable_listing_text();

-- Account deletion must be able to remove the auth user and every dependent row.
alter table public.auctions drop constraint if exists auctions_seller_id_fkey;
alter table public.auctions add constraint auctions_seller_id_fkey
  foreign key (seller_id) references public.profiles (id) on delete cascade;
alter table public.bids drop constraint if exists bids_bidder_id_fkey;
alter table public.bids add constraint bids_bidder_id_fkey
  foreign key (bidder_id) references public.profiles (id) on delete cascade;
alter table public.featured_articles drop constraint if exists featured_articles_created_by_fkey;
alter table public.featured_articles add constraint featured_articles_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete cascade;
alter table public.buy_now_requests drop constraint if exists buy_now_requests_buyer_id_fkey;
alter table public.buy_now_requests add constraint buy_now_requests_buyer_id_fkey
  foreign key (buyer_id) references public.profiles (id) on delete cascade;
