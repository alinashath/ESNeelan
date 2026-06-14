-- Fix PostgreSQL 42P17: "infinite recursion detected in policy for relation auctions"
--
-- auctions_select used `exists (select … from public.profiles …)`. Reading `profiles`
-- applies profiles RLS; policies like `profiles_select_as_seller` subquery `auctions`,
-- which re-evaluates `auctions_select` → infinite recursion.
--
-- Use existing SECURITY DEFINER helper `public.profile_is_suspended(uuid)` (see
-- 20250522140000_profiles_rls_fix_extend_avatars.sql) instead of a direct profiles
-- subquery, matching the earlier fix that 20250525120002_featured_bid_rpcs_rls.sql
-- accidentally reverted when extending public auction statuses.

drop policy if exists auctions_select on public.auctions;

create policy auctions_select on public.auctions for select using (
  public.is_admin ()
  or seller_id = auth.uid ()
  or (
    status in (
      'active',
      'ended',
      'won',
      'paid',
      'completed',
      'awaiting_winner_consent',
      'payment_stage'
    )
    and not public.profile_is_suspended (auctions.seller_id)
  )
);
