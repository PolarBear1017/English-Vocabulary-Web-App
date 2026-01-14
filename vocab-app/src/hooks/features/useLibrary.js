import { useCallback, useEffect, useMemo, useState } from 'react';
import { createEmptyCard } from 'ts-fsrs';
import {
  loadCachedFolders,
  loadCachedVocab,
  saveCachedFolders,
  saveCachedVocab,
  loadFolderSortBy,
  saveFolderSortBy,
  loadWordSortBy,
  saveWordSortBy
} from '../../services/storageService';
import {
  fetchFolders,
  createFolder as createFolderRecord,
  deleteFolder as deleteFolderRecord,
  deleteFolders as deleteFoldersRecord,
  updateFolder as updateFolderRecord,
  fetchUserLibrary,
  fetchDictionaryWord,
  insertDictionaryWord,
  fetchUserLibraryEntry,
  insertUserLibraryEntry,
  updateUserLibraryFoldersByWord,
  updateUserLibraryFoldersByLibraryId
} from '../../services/libraryService';
import { fetchStory } from '../../services/aiService';
import { mapLibraryRowToWord } from '../../domain/mappers/libraryMapper';
import { serializeFsrsCard } from '../../utils/data';
import useLibraryIndex from './useLibraryIndex';

const DEFAULT_FOLDERS = [{ id: 'default', name: '預設資料夾', words: [] }];

const useLibrary = ({ session, apiKeys, showToast, onRequireApiKeys }) => {
  const [folders, setFolders] = useState(() => loadCachedFolders());
  const [vocabData, setVocabData] = useState(() => loadCachedVocab());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [viewingFolderId, setViewingFolderId] = useState(null);
  const [story, setStory] = useState(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [folderSortBy, setFolderSortBy] = useState(() => loadFolderSortBy());
  const [wordSortBy, setWordSortBy] = useState(() => loadWordSortBy());

  const index = useLibraryIndex({ folders, vocabData });

  const activeFolder = viewingFolderId ? folders.find(folder => folder.id === viewingFolderId) : null;

  const sortedFolders = useMemo(() => {
    const copy = [...folders];
    switch (folderSortBy) {
      case 'name_asc':
        return copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'));
      case 'count_desc':
        return copy.sort((a, b) => {
          const aCount = index.statsByFolderId[a.id]?.count || 0;
          const bCount = index.statsByFolderId[b.id]?.count || 0;
          return bCount - aCount;
        });
      case 'created_desc':
      default:
        return copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
  }, [folders, folderSortBy, index.statsByFolderId]);

  const sortedActiveFolderWords = useMemo(() => {
    if (!activeFolder) return [];
    const words = index.entriesByFolderId[activeFolder.id] || [];
    const copy = [...words];
    switch (wordSortBy) {
      case 'alphabetical_asc':
        return copy.sort((a, b) => (a.word || '').localeCompare(b.word || '', 'en'));
      case 'proficiency_asc':
        return copy.sort((a, b) => (a.proficiencyScore || 0) - (b.proficiencyScore || 0));
      case 'next_review_asc':
        return copy.sort((a, b) => new Date(a.nextReview || 0) - new Date(b.nextReview || 0));
      case 'added_desc':
      default:
        return copy.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
    }
  }, [activeFolder, index.entriesByFolderId, wordSortBy]);

  const loadData = useCallback(async (userId) => {
    try {
      const { data: dbFolders, error: folderError } = await fetchFolders(userId);
      if (folderError) throw folderError;

      const allFolders = [...DEFAULT_FOLDERS];
      if (dbFolders) allFolders.push(...dbFolders.map(f => ({ ...f, id: f.id?.toString(), words: [] })));
      setFolders(allFolders);

      const { data, error } = await fetchUserLibrary(userId);
      if (error) throw error;

      if (data) {
        const loadedVocab = data.map(mapLibraryRowToWord);
        setVocabData(loadedVocab);
      }
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Supabase 載入失敗:", error);
      setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadData(session.user.id);
    } else {
      setFolders(DEFAULT_FOLDERS);
      setVocabData([]);
      setIsDataLoaded(true);
    }
  }, [loadData, session?.user?.id]);

  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!session?.user) return;
      setIsDataLoaded(false);
      loadData(session.user.id);
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [loadData, session]);

  useEffect(() => {
    saveCachedFolders(folders);
    saveCachedVocab(vocabData);
  }, [folders, vocabData]);

  useEffect(() => {
    saveFolderSortBy(folderSortBy);
  }, [folderSortBy]);

  useEffect(() => {
    saveWordSortBy(wordSortBy);
  }, [wordSortBy]);

  const handleManualSync = useCallback(() => {
    if (session?.user) {
      setIsDataLoaded(false);
      loadData(session.user.id).then(() => alert("同步完成！"));
    } else {
      alert("請先登入才能同步資料！");
    }
  }, [loadData, session]);

  const createFolder = useCallback(async ({ name, description }) => {
    const nextName = (name || '').trim();
    if (!nextName) {
      alert('資料夾名稱不能為空');
      return false;
    }
    const nextDescription = (description || '').trim();

    if (session?.user) {
      const payload = {
        name: nextName,
        description: nextDescription ? nextDescription : null,
        userId: session.user.id
      };
      const { data, error } = await createFolderRecord(payload);
      if (error) {
        let message = error.message;
        if (message.includes('column "description" of relation "folders" does not exist')) {
          message = '資料庫尚未更新。請新增 folders.description 欄位後再試。';
        }
        alert("建立資料夾失敗: " + message);
        return false;
      }
      setFolders(prev => [...prev, { ...data, id: data.id?.toString() }]);
      return true;
    }

    setFolders(prev => [...prev, {
      id: Date.now().toString(),
      name: nextName,
      description: nextDescription ? nextDescription : null,
      words: []
    }]);
    return true;
  }, [session]);

  const handleDeleteFolder = useCallback(async (folderId) => {
    if (!confirm('確定刪除此資料夾？(資料夾內的單字不會被刪除，只會移除分類)')) return;

    if (session?.user && folderId !== 'default') {
      const { error } = await deleteFolderRecord(folderId);
      if (error) return alert("刪除失敗: " + error.message);
    }

    setFolders(prev => prev.filter(folder => folder.id !== folderId));
    if (viewingFolderId === folderId) setViewingFolderId(null);
  }, [session, viewingFolderId]);

  const handleDeleteFolders = useCallback(async (folderIds) => {
    const deletableIds = (Array.isArray(folderIds) ? folderIds : [])
      .map(id => id?.toString())
      .filter(id => id && id !== 'default');
    if (deletableIds.length === 0) return false;

    if (session?.user) {
      const { error } = await deleteFoldersRecord({
        folderIds: deletableIds,
        userId: session.user.id
      });
      if (error) {
        alert(`刪除失敗: ${error.message}`);
        return false;
      }
    }

    setFolders(prev => prev.filter(folder => !deletableIds.includes(folder.id)));
    if (viewingFolderId && deletableIds.includes(viewingFolderId)) {
      setViewingFolderId(null);
    }
    return true;
  }, [session, viewingFolderId]);

  const handleEditFolder = useCallback(async (folder, updates) => {
    if (!folder) return false;
    const nextName = (updates?.name || '').trim();
    const nextDescription = (updates?.description || '').trim();

    if (!nextName) {
      alert('資料夾名稱不能為空');
      return false;
    }

    const payload = {
      name: nextName,
      description: nextDescription ? nextDescription : null
    };

    if (session?.user && folder.id !== 'default') {
      const { data, error } = await updateFolderRecord({
        folderId: folder.id,
        userId: session.user.id,
        ...payload
      });
      if (error) {
        let message = error.message;
        if (message.includes('column "description" of relation "folders" does not exist')) {
          message = '資料庫尚未更新。請新增 folders.description 欄位後再試。';
        }
        alert('更新失敗: ' + message);
        return false;
      }

      setFolders(prev => prev.map(item => item.id === folder.id ? { ...item, ...data } : item));
      return true;
    }

    setFolders(prev => prev.map(item => item.id === folder.id ? { ...item, ...payload } : item));
    return true;
  }, [session]);

  const saveWordToFolder = useCallback(async (searchResult, folderId) => {
    if (!searchResult || !session) {
      if (!session) alert("請先登入才能儲存單字！");
      return false;
    }

    const folderName = folders.find(folder => folder.id === folderId)?.name || '資料夾';

    try {
      let { data: dictWord, error: fetchError } = await fetchDictionaryWord(searchResult.word);
      if (fetchError) throw fetchError;

      if (!dictWord) {
        const { data: newDictWord, error: dictError } = await insertDictionaryWord({
          word: searchResult.word,
          definition: searchResult.definition,
          translation: searchResult.translation,
          pos: searchResult.pos,
          phonetic: searchResult.phonetic,
          example: searchResult.example,
          mnemonics: searchResult.mnemonics || null
        });

        if (dictError) {
          if (dictError.code === '23505') {
            const { data: retryWord, error: retryError } = await fetchDictionaryWord(searchResult.word);
            if (retryError) throw retryError;
            dictWord = retryWord;
          } else {
            throw dictError;
          }
        } else {
          dictWord = newDictWord;
        }
      }

      if (!dictWord) throw new Error("無法取得單字 ID (請稍後再試)");

      const { data: existingEntry, error: libFetchError } = await fetchUserLibraryEntry({
        userId: session.user.id,
        wordId: dictWord.id
      });
      if (libFetchError) throw libFetchError;

      if (existingEntry) {
        const currentFolders = Array.isArray(existingEntry.folder_ids) ? existingEntry.folder_ids : [];
        const normalizedCurrentFolders = currentFolders.map(id => id?.toString());
        const normalizedFolderId = folderId?.toString();

        if (!normalizedFolderId) {
          throw new Error("無效的資料夾 ID，請重新整理後再試。");
        }

        if (normalizedCurrentFolders.includes(normalizedFolderId)) {
          showToast?.(`「${searchResult.word}」已在「${folderName}」`, 'info');
          return false;
        }

        const newFolders = Array.from(new Set([...normalizedCurrentFolders, normalizedFolderId]));

        const { data: updatedEntry, error: updateError } = await updateUserLibraryFoldersByWord({
          userId: session.user.id,
          wordId: dictWord.id,
          folderIds: newFolders
        });

        if (updateError) throw updateError;

        const mergedFolderIds = Array.isArray(updatedEntry?.folder_ids)
          ? updatedEntry.folder_ids.map(id => id?.toString())
          : newFolders;
        setVocabData(prev => prev.map(word => word.id === dictWord.id.toString() ? { ...word, folderIds: mergedFolderIds } : word));
        showToast?.(`已加入「${folderName}」`);
        return true;
      }

      const now = new Date();
      const initialCard = createEmptyCard();
      initialCard.due = now;
      const fsrsState = serializeFsrsCard(initialCard);

      const payload = {
        user_id: session.user.id,
        word_id: dictWord.id,
        folder_ids: [folderId?.toString()],
        next_review: fsrsState.due,
        ...fsrsState
      };

      let { data: libraryEntry, error: libError } = await insertUserLibraryEntry(payload);

      if (libError) {
        if (libError.code === '23505') {
          const { data: fallbackEntry, error: fallbackError } = await fetchUserLibraryEntry({
            userId: session.user.id,
            wordId: dictWord.id
          });

          if (fallbackError) throw fallbackError;
          if (!fallbackEntry) throw new Error("無法取得既有單字紀錄，請稍後再試。");

          const currentFolders = Array.isArray(fallbackEntry.folder_ids) ? fallbackEntry.folder_ids : [];
          const normalizedCurrentFolders = currentFolders.map(id => id?.toString());
          const normalizedFolderId = folderId?.toString();

          if (!normalizedFolderId) {
            throw new Error("無效的資料夾 ID，請重新整理後再試。");
          }

          if (normalizedCurrentFolders.includes(normalizedFolderId)) {
            showToast?.(`「${searchResult.word}」已在「${folderName}」`, 'info');
            return false;
          }

          const newFolders = Array.from(new Set([...normalizedCurrentFolders, normalizedFolderId]));
          const { data: updatedEntry, error: updateError } = await updateUserLibraryFoldersByWord({
            userId: session.user.id,
            wordId: dictWord.id,
            folderIds: newFolders
          });

          if (updateError) throw updateError;

          const mergedFolderIds = Array.isArray(updatedEntry?.folder_ids)
            ? updatedEntry.folder_ids.map(id => id?.toString())
            : newFolders;
          setVocabData(prev => prev.map(word => word.id === dictWord.id.toString() ? { ...word, folderIds: mergedFolderIds } : word));
          showToast?.(`已加入「${folderName}」`);
          return true;
        }
        throw libError;
      }

      const newWordState = {
        ...searchResult,
        id: dictWord.id.toString(),
        libraryId: libraryEntry.id,
        folderIds: [folderId?.toString()],
        addedAt: libraryEntry.created_at || new Date().toISOString(),
        nextReview: libraryEntry.next_review || fsrsState.due,
        ...fsrsState,
        proficiencyScore: 0
      };

      setVocabData(prev => [...prev, newWordState]);

      showToast?.(`已儲存到「${folderName}」`);
      return true;
    } catch (error) {
      console.error("儲存失敗:", error);
      let message = error.message || "請稍後再試";
      if (message.includes("row-level security")) {
        message = "資料庫權限不足。請在 Supabase SQL Editor 執行 RLS 政策指令以開放寫入權限。";
      } else if (message.includes('column "folder_ids" of relation "user_library" does not exist')) {
        message = "資料庫尚未更新。請在 Supabase SQL Editor 執行: ALTER TABLE user_library ADD COLUMN folder_ids text[] DEFAULT '{}';";
      }
      alert("儲存失敗: " + message);
      return false;
    }
  }, [folders, session, showToast]);

  const handleRemoveWordFromFolder = useCallback(async (word, folderId) => {
    const currentFolders = Array.isArray(word.folderIds) ? word.folderIds.map(id => id?.toString()) : [];
    const normalizedFolderId = folderId?.toString();
    if (!normalizedFolderId || currentFolders.length === 0) return;

    if (!currentFolders.includes(normalizedFolderId)) return;

    const nextFolders = currentFolders.filter(id => id !== normalizedFolderId);

    if (nextFolders.length === 0) {
      if (session?.user) {
        const { error } = await updateUserLibraryFoldersByLibraryId({
          userId: session.user.id,
          libraryId: word.libraryId,
          folderIds: []
        });

        if (error) {
          alert("移除失敗: " + error.message);
          return;
        }
      }

      setVocabData(prev => prev.map(item => item.id === word.id ? { ...item, folderIds: [] } : item));
      return;
    }

    if (session?.user) {
      const { error } = await updateUserLibraryFoldersByLibraryId({
        userId: session.user.id,
        libraryId: word.libraryId,
        folderIds: nextFolders
      });

      if (error) {
        alert("移除失敗: " + error.message);
        return;
      }
    }

    setVocabData(prev => prev.map(item => item.id === word.id ? { ...item, folderIds: nextFolders } : item));
  }, [session]);

  const handleRemoveWordsFromFolder = useCallback(async (words, folderId) => {
    const normalizedFolderId = folderId?.toString();
    if (!normalizedFolderId) return false;
    const targets = Array.isArray(words) ? words : [];
    if (targets.length === 0) return false;

    const updates = [];
    const failed = [];

    for (const word of targets) {
      const currentFolders = Array.isArray(word.folderIds) ? word.folderIds.map(id => id?.toString()) : [];
      if (!currentFolders.includes(normalizedFolderId)) continue;
      const nextFolders = currentFolders.filter(id => id !== normalizedFolderId);

      if (session?.user) {
        if (!word.libraryId) {
          failed.push(word.id);
          continue;
        }
        const { error } = await updateUserLibraryFoldersByLibraryId({
          userId: session.user.id,
          libraryId: word.libraryId,
          folderIds: nextFolders
        });

        if (error) {
          failed.push(word.id);
          continue;
        }
      }

      updates.push({ id: word.id, folderIds: nextFolders });
    }

    if (updates.length > 0) {
      setVocabData(prev => prev.map(item => {
        const update = updates.find(entry => entry.id === item.id);
        return update ? { ...item, folderIds: update.folderIds } : item;
      }));
    }

    if (failed.length > 0) {
      alert(`移除失敗: ${failed.length} 個單字未更新`);
    }

    return updates.length > 0;
  }, [session]);

  const handleMoveWordsToFolder = useCallback(async (words, fromFolderId, toFolderId) => {
    const normalizedFromId = fromFolderId?.toString();
    const normalizedToId = toFolderId?.toString();
    if (!normalizedFromId || !normalizedToId) return false;
    if (normalizedFromId === normalizedToId) return false;

    const targets = Array.isArray(words) ? words : [];
    if (targets.length === 0) return false;

    const updates = [];
    const failed = [];

    for (const word of targets) {
      const currentFolders = Array.isArray(word.folderIds) ? word.folderIds.map(id => id?.toString()) : [];
      if (!currentFolders.includes(normalizedFromId)) continue;

      const withoutFrom = currentFolders.filter(id => id !== normalizedFromId);
      const nextFolders = Array.from(new Set([...withoutFrom, normalizedToId]));

      if (session?.user) {
        if (!word.libraryId) {
          failed.push(word.id);
          continue;
        }
        const { error } = await updateUserLibraryFoldersByLibraryId({
          userId: session.user.id,
          libraryId: word.libraryId,
          folderIds: nextFolders
        });

        if (error) {
          failed.push(word.id);
          continue;
        }
      }

      updates.push({ id: word.id, folderIds: nextFolders });
    }

    if (updates.length > 0) {
      setVocabData(prev => prev.map(item => {
        const update = updates.find(entry => entry.id === item.id);
        return update ? { ...item, folderIds: update.folderIds } : item;
      }));
    }

    if (failed.length > 0) {
      alert(`移動失敗: ${failed.length} 個單字未更新`);
    }

    return updates.length > 0;
  }, [session]);

  const generateFolderStory = useCallback(async (folder) => {
    if (!apiKeys?.geminiKey && !apiKeys?.groqKey) {
      if (onRequireApiKeys) onRequireApiKeys();
      alert("請先設定 API Key 才能使用故事生成功能！");
      return;
    }

    const wordsInFolder = (index.entriesByFolderId[folder.id] || []).map(word => word.word);
    if (wordsInFolder.length < 3) {
      alert("資料夾內至少需要 3 個單字才能生成故事喔！");
      return;
    }

    const targetWords = wordsInFolder.slice(0, 10);

    setIsGeneratingStory(true);
    setStory(null);

    try {
      const storyText = await fetchStory({
        geminiKey: apiKeys.geminiKey,
        groqKey: apiKeys.groqKey,
        words: targetWords
      });
      setStory(storyText);
    } catch (error) {
      alert("故事生成失敗: " + error.message);
    } finally {
      setIsGeneratingStory(false);
    }
  }, [apiKeys, index.entriesByFolderId, onRequireApiKeys]);

  const updateWord = useCallback((wordId, updates) => {
    setVocabData(prev => prev.map(word => word.id === wordId ? { ...word, ...updates } : word));
  }, []);

  return {
    state: {
      folders,
      vocabData,
      isDataLoaded,
      viewingFolderId,
      story,
      isGeneratingStory,
      folderSortBy,
      wordSortBy
    },
    derived: {
      activeFolder,
      sortedFolders,
      sortedActiveFolderWords,
      index
    },
    actions: {
      setViewingFolderId,
      setStory,
      setIsGeneratingStory,
      setFolderSortBy,
      setWordSortBy,
      loadData,
      handleManualSync,
      createFolder,
      handleDeleteFolder,
      handleDeleteFolders,
      handleEditFolder,
      saveWordToFolder,
      handleRemoveWordFromFolder,
      handleRemoveWordsFromFolder,
      handleMoveWordsToFolder,
      generateFolderStory,
      updateWord
    }
  };
};

export default useLibrary;
