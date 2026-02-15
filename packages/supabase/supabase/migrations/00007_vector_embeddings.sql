-- Enable pgvector for semantic search
create extension if not exists vector with schema extensions;

-- Add embedding column to transcripts (OpenAI text-embedding-3-small = 1536 dims)
alter table public.transcripts
  add column if not exists embedding extensions.vector(1536) null;

-- HNSW index for cosine similarity search
create index if not exists idx_transcripts_embedding
  on public.transcripts using hnsw (embedding vector_cosine_ops)
  where embedding is not null;
