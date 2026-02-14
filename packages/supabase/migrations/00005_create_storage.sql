insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false);

create policy "Users can upload own recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own recordings"
  on storage.objects for select
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own recordings"
  on storage.objects for delete
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
