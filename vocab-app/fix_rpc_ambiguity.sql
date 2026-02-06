-- Drop the legacy function signature that accepted folder_id as TEXT
DROP FUNCTION IF EXISTS save_word_with_preferences(jsonb, uuid, text, jsonb);

-- Verify: The specific UUID version should remain.
-- If you want to be 100% sure, you can re-run the creation of the UUID version below, 
-- but strictly speaking, dropping the conflicting one is enough.
