import { supabase } from '../supabase';

const fetchFolders = async (userId) => {
  return supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
};

const createFolder = async ({ name, description, userId }) => {
  return supabase
    .from('folders')
    .insert({ name, description, user_id: userId })
    .select()
    .single();
};

const deleteFolder = async (folderId) => {
  return supabase
    .from('folders')
    .delete()
    .eq('id', folderId);
};

const deleteFolders = async ({ folderIds, userId }) => {
  return supabase
    .from('folders')
    .delete()
    .in('id', folderIds)
    .eq('user_id', userId);
};

const updateFolder = async ({ folderId, name, description, userId }) => {
  return supabase
    .from('folders')
    .update({ name, description })
    .eq('id', folderId)
    .eq('user_id', userId)
    .select()
    .single();
};

const fetchUserLibrary = async (userId) => {
  return supabase
    .from('user_library')
    .select(`
      *,
      library_folder_map (
        folder_id
      ),
      dictionary (
        word,
        definition,
        translation,
        pos,
        phonetic,
        example,
        mnemonics,
        audio_url,
        us_audio_url,
        uk_audio_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000);
};

const fetchDictionaryWord = async (word) => {
  return supabase
    .from('dictionary')
    .select('id, word')
    .ilike('word', word)
    .maybeSingle();
};

const fetchDictionaryAiData = async (word) => {
  return supabase
    .from('dictionary')
    .select('id, word, ai_data')
    .ilike('word', word)
    .maybeSingle();
};

const insertDictionaryWord = async (payload) => {
  return supabase
    .from('dictionary')
    .insert([payload])
    .select()
    .single();
};

const upsertDictionaryAiData = async ({ word, aiData }) => {
  return supabase
    .from('dictionary')
    .upsert({ word, ai_data: aiData }, { onConflict: 'word' })
    .select('id, word, ai_data')
    .maybeSingle();
};

const fetchUserLibraryEntry = async ({ userId, wordId }) => {
  return supabase
    .from('user_library')
    .select(`
      id,
      library_folder_map ( folder_id )
    `)
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle();
};

const insertUserLibraryEntry = async (payload) => {
  return supabase
    .from('user_library')
    .insert([payload])
    .select()
    .single();
};

const updateUserLibraryFoldersByWord = async ({ userId, wordId, folderIds }) => {
  // 1. Get Library ID first
  const { data: libData } = await supabase
    .from('user_library')
    .select('id')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single();

  if (!libData) return { error: { message: 'Word not found in library' } };

  return updateUserLibraryFoldersByLibraryId({
    userId,
    libraryId: libData.id,
    folderIds
  });
};

const updateUserLibraryFoldersByLibraryId = async ({ userId, libraryId, folderIds }) => {
  // 1. Delete existing mappings
  const { error: deleteError } = await supabase
    .from('library_folder_map')
    .delete()
    .eq('library_id', libraryId)
    .eq('user_id', userId);

  if (deleteError) return { error: deleteError };

  // 2. Insert new mappings
  if (Array.isArray(folderIds) && folderIds.length > 0) {
    const validIds = [...new Set(folderIds)].filter(id => id && id !== 'default');
    if (validIds.length === 0) return { data: [], error: null };

    const rows = validIds.map(fid => ({
      library_id: libraryId,
      folder_id: fid,
      user_id: userId
    }));

    return supabase
      .from('library_folder_map')
      .insert(rows);
  }

  return { data: [], error: null };
};

const updateUserLibraryProgress = async ({ libraryId, payload }) => {
  return supabase
    .from('user_library')
    .update(payload)
    .eq('id', libraryId);
};

const updateUserLibrarySourceByLibraryId = async ({ libraryId, source, isAiGenerated }) => {
  return supabase
    .from('user_library')
    .update({
      source,
      is_ai_generated: isAiGenerated
    })
    .eq('id', libraryId);
};

const saveWordWithPreferences = async ({ wordData, userId, folderId, selectedDefinitions }) => {
  return supabase.rpc('save_word_with_preferences', {
    p_word_data: wordData,
    p_user_id: userId,
    p_folder_id: folderId,
    p_selected_defs: selectedDefinitions
  });
};

export {
  fetchFolders,
  createFolder,
  deleteFolder,
  deleteFolders,
  updateFolder,
  fetchUserLibrary,
  fetchDictionaryWord,
  fetchDictionaryAiData,
  insertDictionaryWord,
  upsertDictionaryAiData,
  fetchUserLibraryEntry,
  insertUserLibraryEntry,
  updateUserLibraryFoldersByWord,
  updateUserLibraryFoldersByLibraryId,
  updateUserLibraryProgress,
  updateUserLibrarySourceByLibraryId,
  saveWordWithPreferences
};
