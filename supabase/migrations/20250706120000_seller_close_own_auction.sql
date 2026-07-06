-- Allow sellers to finalize their own past-end active auctions without waiting for cron.

create or replace function public.close_single_expired_auction (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_winner uuid;
  v_max numeric;
  v_new_status text;
begin
  select a.id, a.seller_id, a.title, a.payment_instructions, a.bid_number, a.communication_code, a.seller_phone, a.status, a.ends_at
  into v_rec
  from public.auctions a
  where a.id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_rec.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active', 'status', v_rec.status);
  end if;

  if timezone('utc', now()) <= v_rec.ends_at then
    return jsonb_build_object('ok', false, 'error', 'not_ended');
  end if;

  select b.bidder_id, b.amount into v_winner, v_max
  from public.bids b
  where b.auction_id = v_rec.id
  order by b.amount desc, b.created_at desc
  limit 1;

  if v_winner is null then
    update public.auctions set status = 'ended', winner_id = null, updated_at = now() where id = v_rec.id;
    v_new_status := 'ended';
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
      'auction_pending_winner_consent',
      jsonb_build_object(
        'auction_id', v_rec.id,
        'title', v_rec.title,
        'bid_number', v_rec.bid_number,
        'winning_amount', v_max,
        'position', 1
      )
    );

    v_new_status := 'awaiting_winner_consent';
  end if;

  insert into public.notification_outbox (user_id, type, payload)
  select bidder_id, 'auction_ended', jsonb_build_object('auction_id', v_rec.id, 'title', v_rec.title)
  from (
    select distinct bidder_id from public.bids where auction_id = v_rec.id
  ) d;

  return jsonb_build_object('ok', true, 'status', v_new_status);
end;
$$;

create or replace function public.seller_close_own_auction (p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_seller_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select seller_id into v_seller_id from public.auctions where id = p_auction_id;

  if v_seller_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'not_seller');
  end if;

  return public.close_single_expired_auction (p_auction_id);
end;
$$;

grant execute on function public.seller_close_own_auction (uuid) to authenticated;
grant execute on function public.close_single_expired_auction (uuid) to service_role;

-- Refactor batch closer to reuse single-auction logic.
create or replace function public.close_expired_auctions ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_res jsonb;
  n int := 0;
begin
  for v_rec in
    select a.id
    from public.auctions a
    where a.status = 'active'
      and timezone('utc', now()) > a.ends_at
    for update skip locked
  loop
    v_res := public.close_single_expired_auction (v_rec.id);
    if coalesce((v_res ->> 'ok')::boolean, false) then
      n := n + 1;
    end if;
  end loop;

  return n;
end;
$$;
