-- Harden seller_begin_listing_edit: closed/cancelled/ended withdraw starts a fresh
-- listing cycle (clear winner fields + bid counters). Live active / pending keep history.

create or replace function public.seller_begin_listing_edit(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_auction public.auctions;
  v_fresh_cycle boolean := false;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_auction.seller_id <> v_user then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if v_auction.status = 'draft' then return jsonb_build_object('ok', true, 'status', 'draft'); end if;
  if v_auction.status not in ('pending_approval', 'awaiting_payment', 'active', 'ended', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'transaction_in_progress');
  end if;

  -- Fresh cycle: cancelled, ended, or past-end active (Closed in UI).
  -- Live active / pending keep bid history (pause-to-edit).
  v_fresh_cycle :=
    v_auction.status in ('ended', 'cancelled')
    or (v_auction.status = 'active' and v_auction.ends_at <= now());

  update public.auctions
  set
    status = 'draft',
    rejection_reason = null,
    starts_at = case
      when v_fresh_cycle
        then date_trunc('minute', now()) + interval '15 minutes'
      else starts_at
    end,
    ends_at = case
      when v_fresh_cycle
        then date_trunc('minute', now()) + interval '3 days 15 minutes'
      else ends_at
    end,
    -- Reset outcome fields for a clean republish cycle.
    winner_id = case when v_fresh_cycle then null else winner_id end,
    winner_consent_given = case when v_fresh_cycle then false else winner_consent_given end,
    winner_contacted_at = case when v_fresh_cycle then null else winner_contacted_at end,
    winner_position = case when v_fresh_cycle then 1 else winner_position end,
    winner_contact_phone = case when v_fresh_cycle then null else winner_contact_phone end,
    winner_consent_requested_at = case when v_fresh_cycle then null else winner_consent_requested_at end,
    bid_count = case when v_fresh_cycle then 0 else bid_count end,
    current_highest_bid = case when v_fresh_cycle then null else current_highest_bid end,
    updated_at = now()
  where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'draft',
    'fresh_cycle', v_fresh_cycle,
    'bid_count', case
      when v_fresh_cycle then 0
      else coalesce(v_auction.bid_count, 0)
    end
  );
end;
$$;

revoke all on function public.seller_begin_listing_edit(uuid) from public;
grant execute on function public.seller_begin_listing_edit(uuid) to authenticated;

comment on function public.seller_begin_listing_edit(uuid) is
  'Withdraw an editable listing into draft. Cancelled/ended/past-end active reset winner and bid counters for a fresh cycle; live/pending keep bid history.';
