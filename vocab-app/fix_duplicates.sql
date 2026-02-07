-- Migration to fix duplicate words in folders
-- 1. Remove duplicate entries, keeping the one with the earliest created_at (or latest, doesn't simpler matter much for junction table, but let's keep one)
-- simpler approach: use temporary table or CTID.
-- Since this is Supabase/Postgres:

-- Step 1: Identify and delete duplicates
DELETE FROM library_folder_map a USING (
    SELECT MIN(ctid) as ctid, library_id, folder_id
    FROM library_folder_map 
    GROUP BY library_id, folder_id HAVING COUNT(*) > 1
) b
WHERE a.library_id = b.library_id 
AND a.folder_id = b.folder_id 
AND a.ctid <> b.ctid;

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE library_folder_map
ADD CONSTRAINT unique_library_folder_pair UNIQUE (library_id, folder_id);
