import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  loadCachedFolders,
  loadCachedVocab,
  saveCachedFolders,
  saveCachedVocab,
  loadLastUsedFolders,
  saveLastUsedFolders,
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
  updateUserLibraryFoldersByLibraryId,
  saveWordWithPreferences
} from '../../services/libraryService';
import { fetchStory } from '../../services/aiService';
import { mapLibraryRowToWord } from '../../domain/mappers/libraryMapper';
import { createVocabularyWord } from '../../domain/models';
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
  const isSyncing = useRef(false);
  const [lastUsedFolderIds, setLastUsedFolderIds] = useState(() => loadLastUsedFolders());

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
    saveLastUsedFolders(lastUsedFolderIds);
  }, [lastUsedFolderIds]);

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
      return null;
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
        return null;
      }
      const created = { ...data, id: data.id?.toString() };
      setFolders(prev => [...prev, created]);
      return created;
    }

    const created = {
      id: Date.now().toString(),
      name: nextName,
      description: nextDescription ? nextDescription : null,
      words: []
    };
    setFolders(prev => [...prev, created]);
    return created;
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

  const saveWordToFolder = useCallback(async (searchResult, folderId, selectedDefinitions = null) => {
    if (!searchResult) return false;

    const folderName = folders.find(folder => folder.id === folderId)?.name || '資料夾';
    const normalizedFolderId = folderId?.toString();
    const existingWord = vocabData.find(word => (word.word || '').toLowerCase() === (searchResult.word || '').toLowerCase());

    if (existingWord && normalizedFolderId && existingWord.folderIds?.includes(normalizedFolderId)) {
      showToast?.(`「${searchResult.word}」已在「${folderName}」`, 'info');
      return false;
    }

    const nowIso = new Date().toISOString();
    const normalizedSelectedDefinitions = Array.isArray(selectedDefinitions) ? selectedDefinitions : null;

    if (!session) {
      if (existingWord) {
        const nextFolderIds = normalizedFolderId
          ? Array.from(new Set([...(existingWord.folderIds || []).map(id => id?.toString()), normalizedFolderId])).filter(Boolean)
          : (existingWord.folderIds || []);
        const updatedLocal = createVocabularyWord({
          ...existingWord,
          folderIds: nextFolderIds,
          selectedDefinitions: normalizedSelectedDefinitions ?? existingWord.selectedDefinitions ?? null
        });
        setVocabData(prev => prev.map(word => word.id === existingWord.id ? { ...updatedLocal, isLocal: true } : word));
      } else {
        const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const localWord = createVocabularyWord({
          ...searchResult,
          id: tempId,
          folderIds: normalizedFolderId ? [normalizedFolderId] : [],
          selectedDefinitions: normalizedSelectedDefinitions,
          addedAt: nowIso,
          nextReview: nowIso,
          due: nowIso,
          proficiencyScore: 0
        });
        setVocabData(prev => [...prev, { ...localWord, isLocal: true }]);
      }
      toast.success('已暫存於本機 (訪客模式)');
      return true;
    }

    const buildWordFromEntry = (libraryEntry, baseWord) => {
      const mergedFolderIds = Array.isArray(libraryEntry.folder_ids)
        ? libraryEntry.folder_ids.map(id => id?.toString()).filter(Boolean)
        : (normalizedFolderId ? [normalizedFolderId] : []);

      const mergedSelectedDefinitions = Array.isArray(libraryEntry.selected_definitions)
        ? libraryEntry.selected_definitions
        : normalizedSelectedDefinitions;

      return createVocabularyWord({
        ...baseWord,
        id: libraryEntry.word_id?.toString() || baseWord.id,
        libraryId: libraryEntry.id,
        folderIds: mergedFolderIds,
        selectedDefinitions: mergedSelectedDefinitions,
        addedAt: libraryEntry.created_at || nowIso,
        nextReview: libraryEntry.next_review || libraryEntry.due || nowIso,
        due: libraryEntry.due || libraryEntry.next_review || nowIso,
        stability: libraryEntry.stability ?? null,
        difficulty: libraryEntry.difficulty ?? null,
        elapsed_days: libraryEntry.elapsed_days ?? null,
        scheduled_days: libraryEntry.scheduled_days ?? null,
        reps: libraryEntry.reps ?? null,
        lapses: libraryEntry.lapses ?? null,
        state: libraryEntry.state ?? null,
        last_review: libraryEntry.last_review ?? null,
        proficiencyScore: libraryEntry.proficiency_score ?? 0
      });
    };

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticFolderIds = normalizedFolderId
      ? Array.from(new Set([...(existingWord?.folderIds || []).map(id => id?.toString()), normalizedFolderId])).filter(Boolean)
      : (existingWord?.folderIds || []);

    const optimisticWord = createVocabularyWord({
      ...(existingWord || searchResult),
      id: existingWord?.id || optimisticId,
      folderIds: optimisticFolderIds,
      selectedDefinitions: normalizedSelectedDefinitions ?? existingWord?.selectedDefinitions ?? null,
      addedAt: existingWord?.addedAt || nowIso,
      nextReview: existingWord?.nextReview || nowIso,
      due: existingWord?.due || nowIso,
      proficiencyScore: existingWord?.proficiencyScore ?? 0
    });

    const previousWord = existingWord ? { ...existingWord } : null;

    if (existingWord) {
      setVocabData(prev => prev.map(word => word.id === existingWord.id ? optimisticWord : word));
    } else {
      setVocabData(prev => [...prev, optimisticWord]);
    }

    toast.success('已加入單字庫！');

    try {
      const { data, error } = await saveWordWithPreferences({
        wordData: searchResult,
        userId: session.user.id,
        folderId: normalizedFolderId,
        selectedDefinitions
      });

      if (error) throw error;

      const libraryEntry = Array.isArray(data) ? data[0] : data;
      if (!libraryEntry) throw new Error("儲存失敗 (無回傳資料)");

      const reconciledWord = buildWordFromEntry(libraryEntry, optimisticWord);

      setVocabData(prev => {
        const existingOptimistic = prev.find(word => word.id === optimisticWord.id);
        if (existingOptimistic) {
          return prev.map(word => word.id === optimisticWord.id ? reconciledWord : word);
        }
        return prev.map(word => word.id === reconciledWord.id ? reconciledWord : word);
      });
      return true;
    } catch (error) {
      console.error("儲存失敗:", error);
      let message = error?.message || "請稍後再試";
      if (message.includes("row-level security")) {
        message = "資料庫權限不足。請在 Supabase SQL Editor 執行 RLS 政策指令以開放寫入權限。";
      } else if (message.includes('column "folder_ids" of relation "user_library" does not exist')) {
        message = "資料庫尚未更新。請在 Supabase SQL Editor 執行: ALTER TABLE user_library ADD COLUMN folder_ids text[] DEFAULT '{}';";
      } else if (message.includes('column "selected_definitions" of relation "user_library" does not exist')) {
        message = "資料庫尚未更新。請先新增 selected_definitions 欄位。";
      }
      console.error("儲存失敗細節:", message);
      if (previousWord) {
        setVocabData(prev => prev.map(word => word.id === previousWord.id ? previousWord : word));
      } else {
        setVocabData(prev => prev.filter(word => word.id !== optimisticWord.id));
      }
      toast.error('儲存失敗，請再試一次');
      return false;
    }
  }, [folders, session, showToast, vocabData]);

  const syncLocalWords = useCallback(async () => {
    if (!session?.user?.id) return;
    if (isSyncing.current) return;

    const localWords = vocabData.filter(word => word.isLocal);
    if (localWords.length === 0) return;

    const buildWordFromEntry = (libraryEntry, baseWord) => {
      const mergedFolderIds = Array.isArray(libraryEntry.folder_ids)
        ? libraryEntry.folder_ids.map(id => id?.toString()).filter(Boolean)
        : (baseWord.folderIds || []);

      const mergedSelectedDefinitions = Array.isArray(libraryEntry.selected_definitions)
        ? libraryEntry.selected_definitions
        : (Array.isArray(baseWord.selectedDefinitions) ? baseWord.selectedDefinitions : null);

      return createVocabularyWord({
        ...baseWord,
        id: libraryEntry.word_id?.toString() || baseWord.id,
        libraryId: libraryEntry.id,
        folderIds: mergedFolderIds,
        selectedDefinitions: mergedSelectedDefinitions,
        addedAt: libraryEntry.created_at || baseWord.addedAt || null,
        nextReview: libraryEntry.next_review || libraryEntry.due || baseWord.nextReview || null,
        due: libraryEntry.due || libraryEntry.next_review || baseWord.due || null,
        stability: libraryEntry.stability ?? null,
        difficulty: libraryEntry.difficulty ?? null,
        elapsed_days: libraryEntry.elapsed_days ?? null,
        scheduled_days: libraryEntry.scheduled_days ?? null,
        reps: libraryEntry.reps ?? null,
        lapses: libraryEntry.lapses ?? null,
        state: libraryEntry.state ?? null,
        last_review: libraryEntry.last_review ?? null,
        proficiencyScore: libraryEntry.proficiency_score ?? baseWord.proficiencyScore ?? 0
      });
    };

    isSyncing.current = true;
    const toastId = toast.loading('正在同步本機單字...');

    try {
      const results = await Promise.allSettled(localWords.map(async (word) => {
        const { data, error } = await saveWordWithPreferences({
          wordData: word,
          userId: session.user.id,
          folderId: word.folderIds?.[0]?.toString() || null,
          selectedDefinitions: Array.isArray(word.selectedDefinitions) ? word.selectedDefinitions : null
        });

        if (error) throw error;

        const libraryEntry = Array.isArray(data) ? data[0] : data;
        if (!libraryEntry) throw new Error('同步失敗 (無回傳資料)');

        return { word, libraryEntry };
      }));

      const successfulUpdates = new Map();
      results.forEach((result, index) => {
        const sourceWord = localWords[index];
        if (!sourceWord) return;
        if (result.status === 'fulfilled') {
          successfulUpdates.set(
            sourceWord.id,
            buildWordFromEntry(result.value.libraryEntry, sourceWord)
          );
        } else {
          console.error('本機單字同步失敗:', result.reason);
        }
      });

      if (successfulUpdates.size > 0) {
        setVocabData(prev => prev.map(word => {
          const updated = successfulUpdates.get(word.id);
          return updated ? updated : word;
        }));
        toast.success('本機單字已同步至雲端！');
      } else {
        toast.error('同步失敗，請檢查網路連線');
      }
    } finally {
      toast.dismiss(toastId);
      isSyncing.current = false;
    }
  }, [saveWordWithPreferences, session?.user?.id, vocabData]);

  useEffect(() => {
    if (session?.user?.id) {
      syncLocalWords();
    }
  }, [session?.user?.id, syncLocalWords]);

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

  const updateLastUsedFolderIds = useCallback((folderIds) => {
    const normalized = (Array.isArray(folderIds) ? folderIds : [])
      .map(id => id?.toString())
      .filter(Boolean);
    const unique = Array.from(new Set(normalized));
    setLastUsedFolderIds(unique);
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
      wordSortBy,
      lastUsedFolderIds
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
      updateWord,
      updateLastUsedFolderIds
    }
  };
};

export default useLibrary;
