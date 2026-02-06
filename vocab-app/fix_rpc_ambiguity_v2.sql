-- Redefine the RPC function with prefixed parameter names
-- to avoid ambiguity with table column names (e.g. user_id vs p_user_id)

create or replace function save_word_with_preferences(
  p_word_data jsonb,
  p_user_id uuid,
  p_folder_id uuid default null,
  p_selected_defs jsonb default null
)
returns user_library
language plpgsql
as $$
declare
  v_dict_id bigint;
  v_lib_entry user_library;
begin
  -- Insert/Get Dictionary Word
  insert into dictionary (word, definition, translation, pos, phonetic, example, audio_url, us_audio_url, uk_audio_url)
  values (
    p_word_data->>'word',
    p_word_data->>'definition',
    p_word_data->>'translation',
    p_word_data->>'pos',
    p_word_data->>'phonetic',
    p_word_data->>'example',
    p_word_data->>'audioUrl',
    p_word_data->>'usAudioUrl',
    p_word_data->>'ukAudioUrl'
  )
  on conflict (word) do update
  set
    definition = excluded.definition,
    translation = excluded.translation
  returning id into v_dict_id;

  -- Insert/Update User Library
  insert into user_library (user_id, word_id, selected_definitions)
  values (p_user_id, v_dict_id, p_selected_defs)
  on conflict (user_id, word_id) do update
  set
    selected_definitions = excluded.selected_definitions,
    last_review = now()
  returning * into v_lib_entry;

  -- Insert Folder Mapping
  if p_folder_id is not null then
    insert into library_folder_map (library_id, folder_id, user_id)
    values (v_lib_entry.id, p_folder_id, p_user_id)
    on conflict do nothing;
  end if;

  return v_lib_entry;
end;
$$;
