-- Add source tracking for user_library so source can persist across devices.
alter table if exists user_library
  add column if not exists source text;

alter table if exists user_library
  add column if not exists is_ai_generated boolean default false;

-- Optional: backfill source when ai flag is already present.
update user_library
set source = 'Groq AI'
where source is null and is_ai_generated is true;
