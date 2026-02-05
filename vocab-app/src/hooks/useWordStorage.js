import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { createVocabularyWord } from '../domain/models';
import {
  updateUserLibraryFoldersByLibraryId,
  updateUserLibrarySourceByLibraryId,
  saveWordWithPreferences
} from '../services/libraryService';
import { entryToWord } from '../utils/mapper';

const useWordStorage = ({
  session,
  folders,
  vocabData,
  setVocabData,
  showToast,
  pendingSavesRef
}) => {
  const saveWordToFolder = useCallback(async (searchResult, folderId, selectedDefinitions = null, options = {}) => {
    if (!searchResult) return false;
    const showToastFlag = options?.showToast !== false;

    const folderName = folders.find(folder => folder.id === folderId)?.name || '資料夾';
    const normalizedFolderId = folderId?.toString();
    const existingWord = vocabData.find(word => (word.word || '').toLowerCase() === (searchResult.word || '').toLowerCase());

    const normalizedSelectedDefinitions = Array.isArray(selectedDefinitions) ? selectedDefinitions : null;
    const normalizeDefs = (defs) => {
      if (!Array.isArray(defs)) return [];
      return defs.map((def) => ({
        definition: def?.definition || '',
        translation: def?.translation || '',
        example: def?.example || '',
        pos: def?.pos || ''
      }));
    };
    const sameDefinitions = () => {
      const next = normalizeDefs(normalizedSelectedDefinitions);
      const prev = normalizeDefs(existingWord?.selectedDefinitions || existingWord?.selected_definitions);
      return JSON.stringify(next) === JSON.stringify(prev);
    };
    if (existingWord && normalizedFolderId && existingWord.folderIds?.includes(normalizedFolderId)) {
      if (normalizedSelectedDefinitions && !sameDefinitions()) {
        // allow update when only definitions changed
      } else {
        showToast?.(`「${searchResult.word}」已在「${folderName}」`, 'info');
        return false;
      }
    }

    const pendingKey = `${session?.user?.id || 'guest'}::${(searchResult.word || '').toLowerCase()}::${normalizedFolderId || ''}`;
    if (pendingSavesRef.current.has(pendingKey)) return false;
    pendingSavesRef.current.add(pendingKey);

    const nowIso = new Date().toISOString();

    try {
      if (!session) {
        if (existingWord) {
          const nextFolderIds = normalizedFolderId
            ? Array.from(new Set([...(existingWord.folderIds || []).map(id => id?.toString()), normalizedFolderId])).filter(Boolean)
            : (existingWord.folderIds || []);
          const updatedLocal = createVocabularyWord({
            ...existingWord,
            folderIds: nextFolderIds,
            selectedDefinitions: normalizedSelectedDefinitions ?? existingWord.selectedDefinitions ?? null,
            source: existingWord.source ?? searchResult.source ?? null,
            isAiGenerated: existingWord.isAiGenerated ?? searchResult.isAiGenerated ?? false
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
            proficiencyScore: 0,
            source: searchResult.source ?? null,
            isAiGenerated: searchResult.isAiGenerated ?? false
          });
          setVocabData(prev => [...prev, { ...localWord, isLocal: true }]);
        }
        if (showToastFlag) {
          toast.success('已暫存於本機 (訪客模式)');
        }
        return true;
      }

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
        proficiencyScore: existingWord?.proficiencyScore ?? 0,
        source: existingWord?.source ?? searchResult.source ?? null,
        isAiGenerated: existingWord?.isAiGenerated ?? searchResult.isAiGenerated ?? false
      });

      const previousWord = existingWord ? { ...existingWord } : null;

      if (existingWord) {
        setVocabData(prev => prev.map(word => word.id === existingWord.id ? optimisticWord : word));
      } else {
        setVocabData(prev => {
          const already = prev.find(word => (word.word || '').toLowerCase() === (searchResult.word || '').toLowerCase());
          if (already) {
            const nextFolderIds = normalizedFolderId
              ? Array.from(new Set([...(already.folderIds || []).map(id => id?.toString()), normalizedFolderId])).filter(Boolean)
              : (already.folderIds || []);
            const updated = createVocabularyWord({
              ...already,
              folderIds: nextFolderIds,
              selectedDefinitions: normalizedSelectedDefinitions ?? already.selectedDefinitions ?? null
            });
            return prev.map(word => word.id === already.id ? updated : word);
          }
          return [...prev, optimisticWord];
        });
      }

      if (showToastFlag) {
        toast.success('已加入單字庫！');
      }

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

        const reconciledWord = entryToWord({
          entry: libraryEntry,
          baseWord: optimisticWord,
          normalizedFolderId,
          normalizedSelectedDefinitions,
          nowIso
        });

        if (libraryEntry?.id && searchResult?.source) {
          updateUserLibrarySourceByLibraryId({
            libraryId: libraryEntry.id,
            source: searchResult.source,
            isAiGenerated: Boolean(searchResult.isAiGenerated)
          }).catch((error) => {
            if (error?.message?.includes('column \"source\"')) return;
            console.warn('更新來源失敗', error);
          });
        }

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
    } finally {
      pendingSavesRef.current.delete(pendingKey);
    }
  }, [folders, pendingSavesRef, session, setVocabData, showToast, vocabData]);

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
  }, [session, setVocabData]);

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
  }, [session, setVocabData]);

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
  }, [session, setVocabData]);

  const updateWord = useCallback((wordId, updates) => {
    setVocabData(prev => prev.map(word => word.id === wordId ? { ...word, ...updates } : word));
  }, [setVocabData]);

  return {
    actions: {
      saveWordToFolder,
      handleRemoveWordFromFolder,
      handleRemoveWordsFromFolder,
      handleMoveWordsToFolder,
      updateWord
    },
    state: {
      vocabData
    }
  };
};

export default useWordStorage;
