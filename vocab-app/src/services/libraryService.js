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
      dictionary:word_id (*)
    `)
    .eq('user_id', userId);
};

const fetchDictionaryWord = async (word) => {
  return supabase
    .from('dictionary')
    .select('id, word')
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

export {
  fetchFolders,
  createFolder,
  deleteFolder,
  updateFolder,
  fetchUserLibrary,
  fetchDictionaryWord,
  insertDictionaryWord,
  fetchUserLibraryEntry,
  insertUserLibraryEntry,
  updateUserLibraryFoldersByWord,
  updateUserLibraryFoldersByLibraryId,
  updateUserLibraryProgress
};
