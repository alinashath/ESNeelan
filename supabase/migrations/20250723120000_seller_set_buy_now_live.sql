-- Allow sellers to set / change / clear Buy Now on live (active) auctions.

create or replace function public.seller_set_buy_now_price (
  p_auction_id uuid,
  p_buy_now_price numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid ();
  v_auction public.auctions;
  v_min numeric;
  v_pending record;
  v_cleared boolean := false;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.seller_id <> v_user then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_auction.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;

  if now () > v_auction.ends_at then
    return jsonb_build_object('ok', false, 'error', 'auction_ended');
  end if;

  -- Clear Buy Now
  if p_buy_now_price is null then
    update public.auctions
    set buy_now_price = null, updated_at = now ()
    where id = p_auction_id;

    for v_pending in
      select id, buyer_id, amount
      from public.buy_now_requests
      where auction_id = p_auction_id and status = 'pending'
    loop
      update public.buy_now_requests
      set
        status = 'cancelled',
        resolved_at = now (),
        resolved_by = v_user
      where id = v_pending.id;

      insert into public.notification_outbox (user_id, type, payload)
      values (
        v_pending.buyer_id,
        'buy_now_declined',
        jsonb_build_object(
          'auction_id', p_auction_id,
          'title', v_auction.title,
          'bid_number', v_auction.bid_number,
          'amount', v_pending.amount,
          'request_id', v_pending.id,
          'reason', 'buy_now_disabled'
        )
      );
      v_cleared := true;
    end loop;

    return jsonb_build_object(
      'ok', true,
      'buy_now_price', null,
      'pending_cancelled', v_cleared
    );
  end if;

  if p_buy_now_price <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_price');
  end if;

  v_min := greatest(
    v_auction.starting_price,
    coalesce(v_auction.current_highest_bid, v_auction.starting_price)
  );

  if p_buy_now_price <= v_min then
    return jsonb_build_object(
      'ok', false,
      'error', 'buy_now_too_low',
      'min_required', v_min
    );
  end if;

  -- If price changed and a pending request exists at a different amount, cancel it.
  for v_pending in
    select id, buyer_id, amount
    from public.buy_now_requests
    where auction_id = p_auction_id
      and status = 'pending'
      and amount is distinct from p_buy_now_price
  loop
    update public.buy_now_requests
    set
      status = 'cancelled',
      resolved_at = now (),
      resolved_by = v_user
    where id = v_pending.id;

    insert into public.notification_outbox (user_id, type, payload)
    values (
      v_pending.buyer_id,
      'buy_now_declined',
      jsonb_build_object(
        'auction_id', p_auction_id,
        'title', v_auction.title,
        'bid_number', v_auction.bid_number,
        'amount', v_pending.amount,
        'request_id', v_pending.id,
        'reason', 'buy_now_price_changed'
      )
    );
    v_cleared := true;
  end loop;

  update public.auctions
  set buy_now_price = p_buy_now_price, updated_at = now ()
  where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'buy_now_price', p_buy_now_price,
    'pending_cancelled', v_cleared
  );
end;
$$;

grant execute on function public.seller_set_buy_now_price (uuid, numeric) to authenticated;

comment on function public.seller_set_buy_now_price (uuid, numeric) is
  'Seller sets, updates, or clears buy_now_price on a live active auction. Null clears and cancels pending requests.';
