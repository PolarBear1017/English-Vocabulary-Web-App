/* 
  Migration: Fix Folder Saving Bug and Add Missing Dictionary Columns
  
  This migration does three things:
  1. Adds `source` and `is_ai_generated` columns to the `dictionary` table 
     so that the new RPC can successfully insert web scraping metadata.
  2. Adds a UNIQUE constraint on (library_id, folder_id) to `library_folder_map` 
     so that `ON CONFLICT DO NOTHING` can correctly prevent duplicate mappings.
  3. Overwrites the buggy `save_word_with_preferences` function with `p_` prefix
     parameter names, which matches what the frontend API pushes. This replaces 
     the V1 legacy function entirely.
*/

-- 1. Add missing columns to dictionary table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'dictionary' and column_name = 'source') then
    alter table dictionary add column source text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'dictionary' and column_name = 'is_ai_generated') then
    alter table dictionary add column is_ai_generated boolean default false;
  end if;
end
$$;

-- 2. Add Unique Constraint to library_folder_map if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'library_folder_map_unique_link'
  ) then
    alter table library_folder_map
    add constraint library_folder_map_unique_link unique (library_id, folder_id);
  end if;
end
$$;

-- 3. Drop the V2 function that isn't matched by the frontend (which lacked p_ prefix)
DROP FUNCTION IF EXISTS save_word_with_preferences(jsonb, uuid, uuid, jsonb);

-- 4. Recreate the function OVERWRITING the V1 legacy function (which uses p_ parameters)
CREATE OR REPLACE FUNCTION save_word_with_preferences(
  p_word_data jsonb,
  p_user_id uuid,
  p_folder_id uuid default null,
  p_selected_defs jsonb default null
)
RETURNS user_library
LANGUAGE plpgsql
AS $$
declare
  dict_id bigint;
  lib_entry user_library;
begin
  -- Insert/Get Dictionary Word
  insert into dictionary (word, definition, translation, pos, phonetic, example, audio_url, us_audio_url, uk_audio_url, source, is_ai_generated)
  values (
    p_word_data->>'word',
    p_word_data->>'definition',
    p_word_data->>'translation',
    p_word_data->>'pos',
    p_word_data->>'phonetic',
    p_word_data->>'example',
    p_word_data->>'audioUrl',
    p_word_data->>'usAudioUrl',
    p_word_data->>'ukAudioUrl',
    p_word_data->>'source',
    (p_word_data->>'isAiGenerated')::boolean
  )
  on conflict (word) do update
  set
    definition = excluded.definition,
    translation = excluded.translation,
    is_ai_generated = excluded.is_ai_generated
  returning id into dict_id;

  -- Insert/Update User Library
  insert into user_library (user_id, word_id, selected_definitions)
  values (p_user_id, dict_id, p_selected_defs)
  on conflict (user_id, word_id) do update
  set
    selected_definitions = excluded.selected_definitions,
    last_review = now()
  returning * into lib_entry;

  -- Insert Folder Mapping safely, restricted to unique constraint
  if p_folder_id is not null then
    insert into library_folder_map (library_id, folder_id, user_id)
    values (lib_entry.id, p_folder_id, p_user_id)
    on conflict on constraint library_folder_map_unique_link do nothing;
  end if;

  return lib_entry;
end;
$$;
