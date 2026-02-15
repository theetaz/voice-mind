-- Location capture for recordings
alter table public.recordings
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_name text;
