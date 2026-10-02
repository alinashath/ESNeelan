-- Allow admins to permanently delete marketplace / editorial content.
-- Storage objects are cleaned up by the client using returned paths (Storage API).

-- ---------------------------------------------------------------------------
-- RLS: admin delete on content tables
-- ---------------------------------------------------------------------------

drop policy if exists auctions_admin_delete on public.auctions;
create policy auctions_admin_delete on public.auctions
  for delete to authenticated
  using (public.is_admin ());

drop policy if exists auction_images_admin_delete on public.auction_images;
create policy auction_images_admin_delete on public.auction_images
  for delete to authenticated
  using (public.is_admin ());

drop policy if exists auction_categories_admin_delete on public.auction_categories;
create policy auction_categories_admin_delete on public.auction_categories
  for delete to authenticated
  using (public.is_admin ());

drop policy if exists seller_collections_admin_delete on public.seller_collections;
create policy seller_collections_admin_delete on public.seller_collections
  for delete to authenticated
  using (public.is_admin ());

drop policy if exists seller_collection_items_admin_delete on public.seller_collection_items;
create policy seller_collection_items_admin_delete on public.seller_collection_items
  for delete to authenticated
  using (public.is_admin ());

drop policy if exists complaints_admin_delete on public.complaints;
create policy complaints_admin_delete on public.complaints
  for delete to authenticated
  using (public.is_admin ());

drop policy if exists notification_outbox_admin_delete on public.notification_outbox;
create policy notification_outbox_admin_delete on public.notification_outbox
  for delete to authenticated
  using (public.is_admin ());

do $$
begin
  if to_regclass('public.buy_now_requests') is not null then
    execute $p$
      drop policy if exists buy_now_requests_admin_delete on public.buy_now_requests;
      create policy buy_now_requests_admin_delete on public.buy_now_requests
        for delete to authenticated
        using (public.is_admin ());
    $p$;
  end if;

  if to_regclass('public.seller_ratings') is not null then
    execute $p$
      drop policy if exists seller_ratings_admin_delete on public.seller_ratings;
      create policy seller_ratings_admin_delete on public.seller_ratings
        for delete to authenticated
        using (public.is_admin ());
    $p$;
  end if;

  if to_regclass('public.winner_cascade') is not null then
    execute $p$
      drop policy if exists winner_cascade_admin_delete on public.winner_cascade;
      create policy winner_cascade_admin_delete on public.winner_cascade
        for delete to authenticated
        using (public.is_admin ());
    $p$;
  end if;

  if to_regclass('public.auction_closure_reports') is not null then
    execute $p$
      drop policy if exists auction_closure_reports_admin_delete on public.auction_closure_reports;
      create policy auction_closure_reports_admin_delete on public.auction_closure_reports
        for delete to authenticated
        using (public.is_admin ());
    $p$;
  end if;

  if to_regclass('public.user_blocks') is not null then
    execute $p$
      drop policy if exists user_blocks_admin_delete on public.user_blocks;
      create policy user_blocks_admin_delete on public.user_blocks
        for delete to authenticated
        using (public.is_admin ());
    $p$;
  end if;

  if to_regclass('public.bids') is not null then
    execute $p$
      drop policy if exists bids_admin_delete on public.bids;
      create policy bids_admin_delete on public.bids
        for delete to authenticated
        using (public.is_admin ());
    $p$;
  end if;
end $$;

-- Storage: admins may remove objects in content buckets
drop policy if exists auction_images_admin_delete on storage.objects;
create policy auction_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'auction-images' and public.is_admin ());

drop policy if exists seller_collection_covers_admin_delete on storage.objects;
create policy seller_collection_covers_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'seller-collection-covers' and public.is_admin ());

drop policy if exists payment_proofs_admin_delete on storage.objects;
create policy payment_proofs_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.is_admin ());

-- ---------------------------------------------------------------------------
-- RPCs: hard-delete with storage path hints for client cleanup
-- ---------------------------------------------------------------------------

create or replace function public.admin_delete_auction(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_image_paths jsonb := '[]'::jsonb;
  v_proof_path text;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(jsonb_agg(distinct storage_path), '[]'::jsonb)
  into v_image_paths
  from public.auction_images
  where auction_id = p_auction_id;

  v_proof_path := nullif(trim(coalesce(v_auction.listing_fee_proof_path, '')), '');

  delete from public.auctions where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'storage_paths', v_image_paths,
    'payment_proof_path', to_jsonb(v_proof_path)
  );
end;
$$;

revoke all on function public.admin_delete_auction(uuid) from public;
grant execute on function public.admin_delete_auction(uuid) to authenticated;

create or replace function public.admin_delete_seller_collection(p_collection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.seller_collections;
  v_cover text;
begin
  if auth.uid () is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_row
  from public.seller_collections
  where id = p_collection_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_cover := nullif(trim(coalesce(v_row.cover_storage_path, '')), '');

  delete from public.seller_collections where id = p_collection_id;

  return jsonb_build_object(
    'ok', true,
    'cover_storage_path', to_jsonb(v_cover)
  );
end;
$$;

revoke all on function public.admin_delete_seller_collection(uuid) from public;
grant execute on function public.admin_delete_seller_collection(uuid) to authenticated;
