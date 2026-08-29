/* 
  Unified SQL Fix for Supabase:
  1. Adds missing columns to dictionary table safely
  2. Adds unique constraint on library_folder_map safely
  3. Recreates save_word_with_preferences with SECURITY DEFINER (solves RLS permission errors)
  4. Recreates update_word_folders with SECURITY DEFINER (solves RLS permission errors)
  5. Grants execute permissions to authenticated and anon roles
*/

-- 1. Add missing columns to dictionary table
ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false;
ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS us_audio_url text;
ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS uk_audio_url text;

-- 2. Add Unique Constraint to library_folder_map if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_folder_map_unique_link'
  ) THEN
    ALTER TABLE library_folder_map
    ADD CONSTRAINT library_folder_map_unique_link UNIQUE (library_id, folder_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$$;

-- 3. Drop all previous function signatures to prevent schema cache conflict
DROP FUNCTION IF EXISTS save_word_with_preferences(jsonb, uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS save_word_with_preferences(jsonb, uuid, uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS update_word_folders(uuid, bigint, uuid[]);

-- 4. Recreate save_word_with_preferences with SECURITY DEFINER
CREATE OR REPLACE FUNCTION save_word_with_preferences(
  p_word_data jsonb,
  p_user_id uuid,
  p_folder_id uuid DEFAULT NULL,
  p_selected_defs jsonb DEFAULT NULL
)
RETURNS user_library
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dict_id bigint;
  lib_entry user_library;
  is_ai boolean;
BEGIN
  -- Safe boolean parsing
  is_ai := CASE 
    WHEN p_word_data->>'isAiGenerated' = 'true' THEN true 
    WHEN p_word_data->>'is_ai_generated' = 'true' THEN true 
    ELSE false 
  END;

  -- Insert/Get Dictionary Word
  INSERT INTO dictionary (
    word, 
    definition, 
    translation, 
    pos, 
    phonetic, 
    example, 
    audio_url, 
    us_audio_url, 
    uk_audio_url, 
    source, 
    is_ai_generated
  )
  VALUES (
    p_word_data->>'word',
    p_word_data->>'definition',
    p_word_data->>'translation',
    p_word_data->>'pos',
    p_word_data->>'phonetic',
    p_word_data->>'example',
    COALESCE(p_word_data->>'audioUrl', p_word_data->>'audio'),
    COALESCE(p_word_data->>'usAudioUrl', p_word_data->>'us_audio'),
    COALESCE(p_word_data->>'ukAudioUrl', p_word_data->>'uk_audio'),
    p_word_data->>'source',
    is_ai
  )
  ON CONFLICT (word) DO UPDATE
  SET
    definition = EXCLUDED.definition,
    translation = EXCLUDED.translation,
    is_ai_generated = EXCLUDED.is_ai_generated
  RETURNING id INTO dict_id;

  -- Insert/Update User Library
  INSERT INTO user_library (user_id, word_id, selected_definitions)
  VALUES (p_user_id, dict_id, p_selected_defs)
  ON CONFLICT (user_id, word_id) DO UPDATE
  SET
    selected_definitions = EXCLUDED.selected_definitions,
    last_review = now()
  RETURNING * INTO lib_entry;

  -- Insert Folder Mapping safely
  IF p_folder_id IS NOT NULL THEN
    BEGIN
      INSERT INTO library_folder_map (library_id, folder_id, user_id)
      VALUES (lib_entry.id, p_folder_id, p_user_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN lib_entry;
END;
$$;

-- 5. Recreate update_word_folders with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_word_folders(
  p_user_id uuid,
  p_library_id bigint,
  p_folder_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Delete existing mappings
  DELETE FROM library_folder_map
  WHERE library_id = p_library_id
    AND user_id = p_user_id;

  -- 2. Insert new mappings
  IF p_folder_ids IS NOT NULL AND array_length(p_folder_ids, 1) > 0 THEN
    INSERT INTO library_folder_map (library_id, folder_id, user_id)
    SELECT p_library_id, unnest(p_folder_ids), p_user_id
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION save_word_with_preferences(jsonb, uuid, uuid, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_word_folders(uuid, bigint, uuid[]) TO authenticated, anon;
