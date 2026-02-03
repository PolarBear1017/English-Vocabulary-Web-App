create table if not exists word_ai_cache (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  prompt_type text not null,
  content jsonb,
  source text,
  model text,
  updated_at timestamptz default now()
);

create unique index if not exists word_ai_cache_unique
  on word_ai_cache (lower(word), prompt_type);

create index if not exists word_ai_cache_word_idx
  on word_ai_cache (lower(word));
