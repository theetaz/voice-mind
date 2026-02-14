create table public.recordings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled Recording',
  duration_seconds real default 0,
  audio_path text,
  status text default 'recording'
    check (status in ('recording', 'processing', 'ready', 'failed')),
  file_size_bytes bigint default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_recordings_user_id on public.recordings(user_id);
create index idx_recordings_created_at on public.recordings(created_at desc);

alter table public.recordings enable row level security;

create policy "Users can CRUD own recordings"
  on public.recordings for all using (auth.uid() = user_id);
