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
      folder_ids,
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
    .select('id, folder_ids')
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
  return supabase
    .from('user_library')
    .update({ folder_ids: folderIds })
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .select('id, folder_ids')
    .maybeSingle();
};

const updateUserLibraryFoldersByLibraryId = async ({ userId, libraryId, folderIds }) => {
  return supabase
    .from('user_library')
    .update({ folder_ids: folderIds })
    .eq('id', libraryId)
    .eq('user_id', userId);
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
    word_data: wordData,
    user_id: userId,
    folder_id: folderId,
    selected_defs: selectedDefinitions
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
