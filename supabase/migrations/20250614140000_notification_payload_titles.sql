-- Richer in-app / email payloads: include listing title where it was missing.

-- ---------------------------------------------------------------------------
-- admin_reject_auction: include listing title in listing_rejected payload
-- ---------------------------------------------------------------------------
create or replace function public.admin_reject_auction (p_auction_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
begin
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select seller_id, title into v_seller, v_title
  from public.auctions
  where id = p_auction_id and status in ('pending_approval', 'awaiting_payment')
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;

  update public.auctions
  set
    status = 'cancelled',
    rejection_reason = coalesce(p_reason, 'Rejected'),
    updated_at = now()
  where id = p_auction_id;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_seller,
    'listing_rejected',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_title,
      'reason', p_reason
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- close_expired_auctions: title on seller winner + bidder ended notifications
-- ---------------------------------------------------------------------------
create or replace function public.close_expired_auctions ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_winner uuid;
  v_max numeric;
  n int := 0;
begin
  for v_rec in
    select a.id, a.seller_id, a.title, a.payment_instructions, a.bid_number, a.communication_code, a.seller_phone
    from public.auctions a
    where a.status = 'active'
      and timezone('utc', now()) > a.ends_at
    for update skip locked
  loop
    select b.bidder_id, b.amount into v_winner, v_max
    from public.bids b
    where b.auction_id = v_rec.id
    order by b.amount desc, b.created_at desc
    limit 1;

    if v_winner is null then
      update public.auctions set status = 'ended', winner_id = null, updated_at = now() where id = v_rec.id;
    else
      update public.auctions
      set
        status = 'awaiting_winner_consent',
        winner_id = v_winner,
        current_highest_bid = v_max,
        winner_position = 1,
        winner_consent_given = false,
        updated_at = now()
      where id = v_rec.id;

      insert into public.winner_cascade (auction_id, bidder_id, position)
      values (v_rec.id, v_winner, 1);

      insert into public.notification_outbox (user_id, type, payload)
      values (
        v_winner,
        'winner_consent_requested',
        jsonb_build_object(
          'auction_id', v_rec.id,
          'title', v_rec.title,
          'bid_number', v_rec.bid_number,
          'winning_amount', v_max,
          'communication_code', v_rec.communication_code,
          'seller_phone', v_rec.seller_phone,
          'position', 1,
          'payment_instructions', coalesce(v_rec.payment_instructions, 'Contact the seller for payment details.')
        )
      );

      insert into public.notification_outbox (user_id, type, payload)
      values (
        v_rec.seller_id,
        'auction_winner',
        jsonb_build_object(
          'auction_id', v_rec.id,
          'title', v_rec.title,
          'winner_id', v_winner,
          'amount', v_max
        )
      );
    end if;

    insert into public.notification_outbox (user_id, type, payload)
    select bidder_id, 'auction_ended', jsonb_build_object('auction_id', v_rec.id, 'title', v_rec.title)
    from (
      select distinct bidder_id from public.bids where auction_id = v_rec.id
    ) d;

    n := n + 1;
  end loop;

  return n;
end;
$$;
