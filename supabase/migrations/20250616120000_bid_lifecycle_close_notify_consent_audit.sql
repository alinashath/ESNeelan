-- Bid lifecycle: seller notification at close (consent-first) + winner consent audit fields.

-- ---------------------------------------------------------------------------
-- Auctions: consent audit (terms version recorded when winner gives consent)
-- ---------------------------------------------------------------------------
alter table public.auctions
  add column if not exists winner_consent_terms_version text;

comment on column public.auctions.winner_consent_terms_version is
  'App-supplied terms bundle id when the winner called winner_give_consent; for support/audit.';

-- ---------------------------------------------------------------------------
-- close_expired_auctions: do not tell seller they have a final "winner" before consent
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
        'auction_pending_winner_consent',
        jsonb_build_object(
          'auction_id', v_rec.id,
          'title', v_rec.title,
          'bid_number', v_rec.bid_number,
          'winning_amount', v_max,
          'position', 1
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

-- ---------------------------------------------------------------------------
-- winner_give_consent: record terms version from client
-- ---------------------------------------------------------------------------
drop function if exists public.winner_give_consent (uuid);

create or replace function public.winner_give_consent (
  p_auction_id uuid,
  p_terms_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_user uuid := auth.uid ();
  v_buyer_phone text;
  v_ver text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_ver := coalesce(nullif(trim(p_terms_version), ''), 'unspecified');

  select * into v_auction
  from public.auctions
  where id = p_auction_id and status = 'awaiting_winner_consent'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_auction.winner_id is distinct from v_user then
    return jsonb_build_object('ok', false, 'error', 'not_winner');
  end if;

  select phone into v_buyer_phone from public.profiles where id = v_user;

  update public.auctions
  set
    status = 'payment_stage',
    winner_consent_given = true,
    winner_contacted_at = now(),
    winner_contact_phone = v_buyer_phone,
    winner_consent_terms_version = v_ver,
    updated_at = now()
  where id = p_auction_id;

  update public.winner_cascade
  set consented_at = now()
  where auction_id = p_auction_id and bidder_id = v_user;

  insert into public.notification_outbox (user_id, type, payload)
  values (
    v_auction.seller_id,
    'winner_consented',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'winning_amount', v_auction.current_highest_bid,
      'winner_phone', v_buyer_phone,
      'position', v_auction.winner_position
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.winner_give_consent (uuid, text) to authenticated;
