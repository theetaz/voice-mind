-- User settings: transcription and summarization toggles, push token
alter table public.profiles
  add column if not exists transcription_enabled boolean default true,
  add column if not exists summarization_enabled boolean default true,
  add column if not exists expo_push_token text;
