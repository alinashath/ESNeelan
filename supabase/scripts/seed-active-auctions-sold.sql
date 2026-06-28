-- DEV / STAGING ONLY: create 10 dummy bidders + heavy bid activity on active auctions.
-- Listings stay LIVE (status active) so they remain on the home page.
--
-- Paste into Supabase Dashboard → SQL Editor (no service_role API key needed).
--
-- Or via CLI:
--   supabase db execute --linked --file supabase/scripts/seed-active-auctions-sold.sql

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Ten dev bidders (invalid +960 8… phones, fixed UUIDs for idempotent re-runs)
-- ---------------------------------------------------------------------------
do $$
declare
  v_instance uuid;
  v_seed record;
begin
  select id into v_instance from auth.instances limit 1;

  for v_seed in
    select *
    from (
      values
        ('80000001-0000-4000-8000-000000000001'::uuid, 'Mohamed', '+9608000001', 'mohamed'),
        ('80000002-0000-4000-8000-000000000002'::uuid, 'Ayya', '+9608000002', 'ayya'),
        ('80000003-0000-4000-8000-000000000003'::uuid, 'Huwey', '+9608000003', 'huwey'),
        ('80000004-0000-4000-8000-000000000004'::uuid, 'Hassan', '+9608000004', 'hassan'),
        ('80000005-0000-4000-8000-000000000005'::uuid, 'Ibrahim', '+9608000005', 'ibrahim'),
        ('80000006-0000-4000-8000-000000000006'::uuid, 'Fathimath', '+9608000006', 'fathimath'),
        ('80000007-0000-4000-8000-000000000007'::uuid, 'Ahmed', '+9608000007', 'ahmed'),
        ('80000008-0000-4000-8000-000000000008'::uuid, 'Aayan', '+9608000008', 'aayan'),
        ('80000009-0000-4000-8000-000000000009'::uuid, 'Ali', '+9608000009', 'ali'),
        ('8000000a-0000-4000-8000-00000000000a'::uuid, 'Mode', '+9608000010', 'mode')
    ) as s(id, display_name, phone, slug)
  loop
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at
    )
    values (
      v_seed.id,
      v_instance,
      'authenticated',
      'authenticated',
      'auc-seed-' || v_seed.slug || '@effimetic.dev',
      crypt('dev-seed-not-for-login', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email","phone"]}'::jsonb,
      jsonb_build_object('display_name', v_seed.display_name),
      timezone('utc', now()),
      timezone('utc', now()),
      v_seed.phone,
      timezone('utc', now())
    )
    on conflict (id) do update
      set
        phone = excluded.phone,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = timezone('utc', now());

    insert into public.profiles (id, phone, display_name, role)
    values (v_seed.id, v_seed.phone, v_seed.display_name, 'buyer')
    on conflict (id) do update
      set
        phone = excluded.phone,
        display_name = excluded.display_name,
        updated_at = timezone('utc', now());
  end loop;

  raise notice 'Seed bidders ready (10 profiles)';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Active auctions → many bids + completed
-- ---------------------------------------------------------------------------
do $$
declare
  v_rec record;
  v_bidder uuid;
  v_bidders uuid[];
  v_n int;
  v_i int;
  v_amount numeric;
  v_winner uuid;
  v_max numeric;
  v_bid_time timestamptz;
  v_span interval;
  v_bid_num text;
  v_comm_code text;
  v_total_bids int;
  v_progress numeric;
  v_frenzy boolean;
begin
  for v_rec in
    select a.*
    from public.auctions a
    where a.status = 'active'
    order by a.created_at
  loop
    select coalesce(array_agg(p.id order by random()), '{}'::uuid[])
    into v_bidders
    from public.profiles p
    where p.id <> v_rec.seller_id
      and p.suspended_at is null
      and p.phone like '+9608%';

    if coalesce(array_length(v_bidders, 1), 0) = 0 then
      raise notice 'Skip auction % (%): no eligible bidders', v_rec.id, v_rec.title;
      continue;
    end if;

    v_n := 22 + floor(random() * 21)::int;
    v_span := greatest(v_rec.ends_at - v_rec.starts_at, interval '1 day');

    select coalesce(max(b.amount), v_rec.starting_price - v_rec.min_bid_increment)
    into v_amount
    from public.bids b
    where b.auction_id = v_rec.id;

    for v_i in 1..v_n loop
      v_progress := v_i::numeric / v_n::numeric;
      v_frenzy := v_progress > 0.7;

      if v_frenzy then
        v_bidder := v_bidders[1 + floor(random() * least(4, array_length(v_bidders, 1)))::int];
        v_bid_time := v_rec.ends_at
          - (floor(random() * 55)::int || ' minutes')::interval
          - (floor(random() * 50)::int || ' seconds')::interval;
        if v_bid_time < v_rec.starts_at then
          v_bid_time := v_rec.starts_at + v_span * (0.85 + random() * 0.14);
        end if;
        v_amount := v_amount + v_rec.min_bid_increment * (1 + floor(random() * 5)::int);
      else
        v_bidder := v_bidders[1 + floor(random() * array_length(v_bidders, 1))::int];
        v_bid_time := v_rec.starts_at + v_span * power(random(), 0.5) * 0.85;
        v_amount := v_amount + v_rec.min_bid_increment * (1 + floor(random() * 2)::int);
      end if;

      insert into public.bids (auction_id, bidder_id, amount, created_at)
      values (v_rec.id, v_bidder, round(v_amount, 2), v_bid_time);
    end loop;

    select b.bidder_id, b.amount
    into v_winner, v_max
    from public.bids b
    where b.auction_id = v_rec.id
    order by b.amount desc, b.created_at desc
    limit 1;

    select count(*)::int into v_total_bids
    from public.bids b
    where b.auction_id = v_rec.id;

    v_bid_num := v_rec.bid_number;
    v_comm_code := v_rec.communication_code;

    if v_bid_num is null then
      v_bid_num := 'BID-' || lpad(nextval('public.bid_number_seq')::text, 5, '0');
    end if;

    if v_comm_code is null then
      v_comm_code := upper(substr(md5(random()::text || v_rec.id::text), 1, 8));
    end if;

    update public.auctions
    set
      status = 'active',
      current_highest_bid = v_max,
      bid_count = v_total_bids,
      bid_number = v_bid_num,
      communication_code = v_comm_code,
      ends_at = greatest(
        timezone('utc', now()) + interval '14 days',
        v_rec.starts_at + interval '1 day'
      ),
      updated_at = now()
    where id = v_rec.id;

    raise notice 'Seeded auction % (%): % bids, top %, amount % (stays live)',
      v_rec.id, v_rec.title, v_n, v_winner, v_max;
  end loop;
end;
$$;

commit;
