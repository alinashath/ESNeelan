create policy complaints_admin_update on public.complaints for update using (public.is_admin ());
