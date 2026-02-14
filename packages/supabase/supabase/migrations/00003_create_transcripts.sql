create table public.transcripts (
  id uuid default gen_random_uuid() primary key,
  recording_id uuid references public.recordings(id) on delete cascade not null,
  full_text text not null default '',
  words jsonb not null default '[]'::jsonb,
  language text default 'en',
  provider text default 'whisper',
  is_final boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_transcripts_recording_id on public.transcripts(recording_id);

alter table public.transcripts enable row level security;

create policy "Users can view own transcripts"
  on public.transcripts for select
  using (
    exists (
      select 1 from public.recordings
      where recordings.id = transcripts.recording_id
      and recordings.user_id = auth.uid()
    )
  );

create policy "Users can insert own transcripts"
  on public.transcripts for insert
  with check (
    exists (
      select 1 from public.recordings
      where recordings.id = transcripts.recording_id
      and recordings.user_id = auth.uid()
    )
  );
