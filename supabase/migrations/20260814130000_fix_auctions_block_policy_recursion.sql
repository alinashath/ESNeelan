-- Fix 42P17 caused by auctions_select querying profiles while the profiles
-- visibility policy queries auctions. Keep RLS table lookups behind narrowly
-- scoped helpers so neither table's policy recursively evaluates the other.
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
    status in (
      'active', 'ended', 'won', 'paid', 'completed',
      'awaiting_winner_consent', 'payment_stage'
    )
    and not public.profile_is_suspended(auctions.seller_id)
    and not public.current_user_blocks_profile(auctions.seller_id)
  )
);
