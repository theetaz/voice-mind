-- Semantic search RPC: returns recordings with transcript snippets, filtered by user
create or replace function public.search_recordings_by_semantic(
  query_embedding extensions.vector(1536),
  match_count int default 10
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  duration_seconds real,
  audio_path text,
  status text,
  file_size_bytes bigint,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float,
  transcript_snippet text
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    r.id,
    r.user_id,
    r.title,
    r.duration_seconds,
    r.audio_path,
    r.status,
    r.file_size_bytes,
    r.created_at,
    r.updated_at,
    1 - (t.embedding <=> query_embedding) as similarity,
    left(t.full_text, 200) as transcript_snippet
  from public.recordings r
  join public.transcripts t on t.recording_id = r.id and t.is_final = true
  where r.user_id = auth.uid()
    and r.is_hidden is not true
    and t.embedding is not null
  order by t.embedding <=> query_embedding asc
  limit least(match_count, 50);
$$;

-- Calendar view: recordings for a specific date
create or replace function public.get_recordings_by_date(target_date date)
returns setof public.recordings
language sql
security definer
set search_path = public
as $$
  select r.*
  from public.recordings r
  where r.user_id = auth.uid()
    and r.is_hidden is not true
    and r.created_at::date = target_date
  order by r.created_at desc;
$$;
