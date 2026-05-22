-- Storage bucket for auction images
insert into storage.buckets (id, name, public)
values ('auction-images', 'auction-images', true)
on conflict (id) do nothing;

-- Storage policies: path convention {auction_id}/{filename}
create policy auction_images_public_read on storage.objects for select
  using (bucket_id = 'auction-images');

create policy auction_images_owner_write on storage.objects for insert
  with check (
    bucket_id = 'auction-images'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select a.id::text from public.auctions a
      where a.seller_id = auth.uid () and a.status = 'draft'
    )
  );

create policy auction_images_owner_update on storage.objects for update
  using (
    bucket_id = 'auction-images'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select a.id::text from public.auctions a
      where a.seller_id = auth.uid () and a.status = 'draft'
    )
  );

create policy auction_images_owner_delete on storage.objects for delete
  using (
    bucket_id = 'auction-images'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select a.id::text from public.auctions a
      where a.seller_id = auth.uid () and a.status = 'draft'
    )
  );
