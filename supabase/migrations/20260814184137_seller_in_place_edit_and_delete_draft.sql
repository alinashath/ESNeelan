-- Sellers can withdraw a non-transactional listing into draft, edit the same
-- listing ID, and resubmit it through the existing approval flow.
create or replace function public.seller_begin_listing_edit(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_auction public.auctions;
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

  update public.auctions
  set
    status = 'draft',
    rejection_reason = null,
    starts_at = case
      when v_auction.status in ('ended', 'cancelled') or v_auction.ends_at <= now()
        then date_trunc('minute', now()) + interval '15 minutes'
      else starts_at
    end,
    ends_at = case
      when v_auction.status in ('ended', 'cancelled') or v_auction.ends_at <= now()
        then date_trunc('minute', now()) + interval '3 days 15 minutes'
      else ends_at
    end,
    updated_at = now()
  where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'draft',
    'bid_count', coalesce(v_auction.bid_count, 0)
  );
end;
$$;

revoke all on function public.seller_begin_listing_edit(uuid) from public;
grant execute on function public.seller_begin_listing_edit(uuid) to authenticated;

-- Draft deletion is ownership-checked and cascades through relational data.
-- Storage paths are returned so the client can remove objects after commit.
create or replace function public.seller_delete_draft(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_auction public.auctions;
  v_paths jsonb;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_auction.seller_id <> v_user then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if v_auction.status <> 'draft' then return jsonb_build_object('ok', false, 'error', 'not_draft'); end if;
  if coalesce(v_auction.bid_count, 0) > 0 or exists (
    select 1 from public.bids where auction_id = p_auction_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'draft_has_bid_history');
  end if;

  select coalesce(jsonb_agg(distinct storage_path), '[]'::jsonb)
  into v_paths
  from public.auction_images
  where auction_id = p_auction_id;

  delete from public.auctions where id = p_auction_id;
  return jsonb_build_object('ok', true, 'storage_paths', v_paths);
end;
$$;

revoke all on function public.seller_delete_draft(uuid) from public;
grant execute on function public.seller_delete_draft(uuid) to authenticated;
