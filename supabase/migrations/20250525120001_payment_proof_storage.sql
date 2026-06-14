-- Private bucket for featured listing fee payment screenshots

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists payment_proof_upload on storage.objects;
create policy payment_proof_upload on storage.objects
  for insert
  with check (
    bucket_id = 'payment-proofs'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select id::text from public.auctions where seller_id = auth.uid ()
    )
  );

drop policy if exists payment_proof_read on storage.objects;
create policy payment_proof_read on storage.objects
  for select
  using (
    bucket_id = 'payment-proofs'
    and (
      public.is_admin ()
      or (
        auth.role () = 'authenticated'
        and split_part(name, '/', 1) in (
          select id::text from public.auctions where seller_id = auth.uid ()
        )
      )
    )
  );

drop policy if exists payment_proof_update on storage.objects;
create policy payment_proof_update on storage.objects
  for update
  using (
    bucket_id = 'payment-proofs'
    and auth.role () = 'authenticated'
    and split_part(name, '/', 1) in (
      select id::text from public.auctions where seller_id = auth.uid ()
    )
  );
