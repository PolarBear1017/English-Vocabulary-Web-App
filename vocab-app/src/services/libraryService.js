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
  const allData = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
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
          audio_url,
          us_audio_url,
          uk_audio_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...data);
      from += pageSize;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return { data: allData, error: null };
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
  console.group('🛠️ [Debug] 更新單字資料夾關聯 (updateUserLibraryFoldersByLibraryId)');
  console.log('Library ID:', libraryId);
  console.log('Target Folder IDs:', folderIds);

  // Try atomic RPC first to prevent race conditions & intermediate states
  try {
    const { error: rpcError } = await supabase.rpc('update_word_folders', {
      p_user_id: userId,
      p_library_id: libraryId,
      p_folder_ids: (Array.isArray(folderIds) ? folderIds : [])
        .map(id => id?.toString())
        .filter(id => id)
    });

    if (!rpcError) {
      console.log('✅ RPC update_word_folders 執行成功！');
      console.groupEnd();
      return { data: [], error: null };
    }

    console.warn('⚠️ RPC update_word_folders 回傳錯誤:', rpcError);
    // PGRST202/42883 mean function not found. If it's a different database error, return it immediately.
    const isFuncMissing = rpcError.code === 'PGRST202' || rpcError.code === '42883' || rpcError.message?.includes('does not exist');
    if (!isFuncMissing) {
      console.error('❌ 資料庫執行 RPC 出錯 (非函數不存在):', rpcError);
      console.groupEnd();
      return { error: rpcError };
    }
    console.warn('Supabase RPC "update_word_folders" not found. Falling back to non-atomic update.');
  } catch (err) {
    console.warn('Error invoking RPC "update_word_folders", falling back to non-atomic update.', err);
  }

  // Fallback: Delete then Insert (Non-atomic)
  console.log('🔄 執行 Fallback: 清除現有關聯...');
  const { error: deleteError } = await supabase
    .from('library_folder_map')
    .delete()
    .eq('library_id', libraryId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('❌ Fallback Delete 失敗:', deleteError);
    console.groupEnd();
    return { error: deleteError };
  }

  // 2. Insert new mappings
  if (Array.isArray(folderIds) && folderIds.length > 0) {
    const validIds = [...new Set(folderIds)].filter(id => id);
    if (validIds.length === 0) {
      console.groupEnd();
      return { data: [], error: null };
    }

    const rows = validIds.map(fid => ({
      library_id: libraryId,
      folder_id: fid,
      user_id: userId
    }));

    console.log('🔄 執行 Fallback: 新增關聯...', rows);
    const res = await supabase
      .from('library_folder_map')
      .insert(rows);

    if (res.error) {
      console.error('❌ Fallback Insert 失敗:', res.error);
    } else {
      console.log('✅ Fallback Insert 成功');
    }
    console.groupEnd();
    return res;
  }

  console.groupEnd();
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

const deleteUserLibraryEntry = async ({ userId, libraryId }) => {
  return supabase
    .from('user_library')
    .delete()
    .eq('user_id', userId)
    .eq('id', libraryId);
};

const saveWordWithPreferences = async ({ wordData, userId, folderId, selectedDefinitions }) => {
  // Ensure folderId is null if not provided
  const targetFolderId = !folderId ? null : folderId;
  
  return supabase.rpc('save_word_with_preferences', {
    p_word_data: wordData,
    p_user_id: userId,
    p_folder_id: targetFolderId,
    p_selected_defs: selectedDefinitions
  });
};

const toggleUserLibraryStar = async ({ libraryId, isStarred }) => {
  return supabase
    .from('user_library')
    .update({ is_starred: isStarred })
    .eq('id', libraryId);
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
  deleteUserLibraryEntry,
  saveWordWithPreferences,
  toggleUserLibraryStar
};
