/* 1. Create the new Junction Table */
create table if not exists library_folder_map (
  id uuid default gen_random_uuid() primary key,
  library_id bigint references user_library(id) on delete cascade not null,
  folder_id uuid references folders(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

/* 2. Enable RLS (Security) */
alter table library_folder_map enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own folder mappings') then
    create policy "Users can view their own folder mappings"
      on library_folder_map for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own folder mappings') then
    create policy "Users can insert their own folder mappings"
      on library_folder_map for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own folder mappings') then
    create policy "Users can delete their own folder mappings"
      on library_folder_map for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

/* 3. Data Migration (Copy data from array to table) */
with expanded_folders as (
  select
    ul.id as library_id,
    ul.user_id,
    ul.created_at,
    trim(both '"' from unnest(string_to_array(trim(both '{}' from ul.folder_ids::text), ','))) as raw_folder_id
  from user_library ul
  where ul.folder_ids is not null
    and ul.folder_ids::text != '{}'
)
insert into library_folder_map (library_id, folder_id, user_id, created_at)
select
  library_id,
  raw_folder_id::uuid,
  user_id,
  created_at
from expanded_folders
where raw_folder_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  -- Integrity Check: Only insert if folder actually exists (Skip zombie IDs)
  and exists (
    select 1 from folders f where f.id = expanded_folders.raw_folder_id::uuid
  )
  -- Avoid inserting duplicates if run multiple times
  and not exists (
    select 1 from library_folder_map lfm 
    where lfm.library_id = expanded_folders.library_id 
    and lfm.folder_id = expanded_folders.raw_folder_id::uuid
  );

/* 4. Update the RPC function */
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
  -- Insert/Get Dictionary Word
  insert into dictionary (word, definition, translation, pos, phonetic, example, audio_url, us_audio_url, uk_audio_url, source, is_ai_generated)
  values (
    word_data->>'word',
    word_data->>'definition',
    word_data->>'translation',
    word_data->>'pos',
    word_data->>'phonetic',
    word_data->>'example',
    word_data->>'audioUrl',
    word_data->>'usAudioUrl',
    word_data->>'ukAudioUrl',
    word_data->>'source',
    (word_data->>'isAiGenerated')::boolean
  )
  on conflict (word) do update
  set
    definition = excluded.definition,
    translation = excluded.translation,
    is_ai_generated = excluded.is_ai_generated
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
