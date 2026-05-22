-- Allow reading bidder display names on publicly visible auctions (for bid history / UI).
create policy profiles_visible_via_public_bids on public.profiles for select using (
  exists (
    select 1
    from public.bids b
    join public.auctions a on a.id = b.auction_id
    where b.bidder_id = profiles.id
      and a.status in ('active', 'ended', 'won', 'paid', 'completed')
      and not exists (
        select 1
        from public.profiles sp
        where sp.id = a.seller_id
          and sp.suspended_at is not null
      )
  )
);
