-- Redefine the function with SECURITY DEFINER
-- This allows the function to bypass RLS checks on the 'dictionary' table
-- so that authenticated users can insert new words into the shared dictionary.

create or replace function save_word_with_preferences(
  p_word_data jsonb,
  p_user_id uuid,
  p_folder_id uuid default null,
  p_selected_defs jsonb default null
)
returns user_library
language plpgsql
security definer -- Run as the function creator (admin) to bypass dictionary RLS
set search_path = public -- Best practice for security definer
as $$
declare
  v_dict_id bigint;
  v_lib_entry user_library;
begin
  -- Security Check: Ensure users can only modify their own library
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: User ID mismatch';
  end if;

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
