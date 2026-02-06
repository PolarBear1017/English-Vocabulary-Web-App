-- Redefine the RPC function to excluding 'source' and 'is_ai_generated' from the dictionary table
-- because those columns apparently do not exist on the 'dictionary' table.

create or replace function save_word_with_preferences(
  word_data jsonb,
  user_id uuid,
  folder_id uuid default null,
  selected_defs jsonb default null
)
returns user_library
language plpgsql
as $$
declare
  dict_id bigint;
  lib_entry user_library;
begin
  -- Insert/Get Dictionary Word (Removed source, is_ai_generated)
  insert into dictionary (word, definition, translation, pos, phonetic, example, audio_url, us_audio_url, uk_audio_url)
  values (
    word_data->>'word',
    word_data->>'definition',
    word_data->>'translation',
    word_data->>'pos',
    word_data->>'phonetic',
    word_data->>'example',
    word_data->>'audioUrl',
    word_data->>'usAudioUrl',
    word_data->>'ukAudioUrl'
  )
  on conflict (word) do update
  set
    definition = excluded.definition,
    translation = excluded.translation
  returning id into dict_id;

  -- Insert/Update User Library
  insert into user_library (user_id, word_id, selected_definitions)
  values (user_id, dict_id, selected_defs)
  on conflict (user_id, word_id) do update
  set
    selected_definitions = excluded.selected_definitions,
    last_review = now()
  returning * into lib_entry;

  -- Insert Folder Mapping
  if folder_id is not null then
    insert into library_folder_map (library_id, folder_id, user_id)
    values (lib_entry.id, folder_id, user_id)
    on conflict do nothing;
  end if;

  return lib_entry;
end;
$$;
