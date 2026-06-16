-- Featured article images: uploaded cover + inline photo blocks (admin-only writes; public read).

alter table public.featured_articles
  add column if not exists cover_image_storage_path text;

comment on column public.featured_articles.cover_image_storage_path is
  'Path in featured-article-images bucket; when set, preferred over cover_image_url.';

-- Bucket: path convention {article_id}/{filename}
insert into storage.buckets (id, name, public)
values ('featured-article-images', 'featured-article-images', true)
on conflict (id) do nothing;

drop policy if exists featured_article_images_public_read on storage.objects;
create policy featured_article_images_public_read on storage.objects for select
  using (bucket_id = 'featured-article-images');

drop policy if exists featured_article_images_admin_insert on storage.objects;
create policy featured_article_images_admin_insert on storage.objects for insert
  with check (
    bucket_id = 'featured-article-images'
    and auth.role () = 'authenticated'
    and public.is_admin ()
    and split_part(name, '/', 1) in (select fa.id::text from public.featured_articles fa)
  );

drop policy if exists featured_article_images_admin_update on storage.objects;
create policy featured_article_images_admin_update on storage.objects for update
  using (bucket_id = 'featured-article-images' and public.is_admin ())
  with check (bucket_id = 'featured-article-images' and public.is_admin ());

drop policy if exists featured_article_images_admin_delete on storage.objects;
create policy featured_article_images_admin_delete on storage.objects for delete
  using (bucket_id = 'featured-article-images' and public.is_admin ());
