-- Restore listings hidden after dev seed (seed marks auctions completed; home shows active only).
--
-- Paste into Supabase Dashboard → SQL Editor, then refresh the app.
--
-- Or: supabase db execute --linked --file supabase/scripts/restore-listings-active.sql

begin;

update public.auctions a
set
  status = 'active',
  ends_at = greatest(
    timezone('utc', now()) + interval '14 days',
    a.starts_at + interval '1 day'
  ),
  winner_id = null,
  winner_consent_given = false,
  winner_consent_terms_version = null,
  winner_contact_phone = null,
  winner_contacted_at = null,
  updated_at = timezone('utc', now())
where a.status = 'completed'
  and (
    exists (
      select 1
      from public.auction_closure_reports r
      where r.auction_id = a.id
        and r.notes like 'Dev seed:%'
    )
    or exists (
      select 1
      from public.bids b
      join public.profiles p on p.id = b.bidder_id
      where b.auction_id = a.id
        and p.phone like '+9608%'
    )
  );

delete from public.winner_cascade wc
using public.auctions a
where wc.auction_id = a.id
  and a.status = 'active'
  and wc.closure_outcome = 'completed';

delete from public.auction_closure_reports r
using public.auctions a
where r.auction_id = a.id
  and a.status = 'active'
  and r.notes like 'Dev seed:%';

commit;
