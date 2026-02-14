create table public.summaries (
  id uuid default gen_random_uuid() primary key,
  recording_id uuid references public.recordings(id) on delete cascade not null unique,
  content text not null,
  key_points jsonb default '[]'::jsonb,
  model text default 'gpt-4o-mini',
  created_at timestamptz default now() not null
);

create index idx_summaries_recording_id on public.summaries(recording_id);

alter table public.summaries enable row level security;

create policy "Users can view own summaries"
  on public.summaries for select
  using (
    exists (
      select 1 from public.recordings
      where recordings.id = summaries.recording_id
      and recordings.user_id = auth.uid()
    )
  );
