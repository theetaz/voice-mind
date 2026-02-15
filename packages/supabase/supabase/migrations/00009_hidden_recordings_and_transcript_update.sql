-- Hidden recordings
alter table public.recordings
  add column if not exists is_hidden boolean default false;

-- Transcript UPDATE policy for editing
create policy "Users can update own transcripts"
  on public.transcripts for update
  using (
    exists (
      select 1 from public.recordings
      where recordings.id = transcripts.recording_id
      and recordings.user_id = auth.uid()
    )
  );
