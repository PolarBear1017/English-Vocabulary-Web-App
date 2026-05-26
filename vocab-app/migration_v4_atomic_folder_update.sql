-- Migration: Create update_word_folders RPC for atomic folder link updates
-- This combines delete and insert operations into a single database transaction.

CREATE OR REPLACE FUNCTION update_word_folders(
  p_user_id uuid,
  p_library_id bigint,
  p_folder_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Delete existing mappings for the word
  DELETE FROM library_folder_map
  WHERE library_id = p_library_id
    AND user_id = p_user_id;

  -- 2. Insert new mappings if any
  IF p_folder_ids IS NOT NULL AND array_length(p_folder_ids, 1) > 0 THEN
    INSERT INTO library_folder_map (library_id, folder_id, user_id)
    SELECT p_library_id, unnest(p_folder_ids), p_user_id
    ON CONFLICT ON CONSTRAINT library_folder_map_unique_link DO NOTHING;
  END IF;
END;
$$;
