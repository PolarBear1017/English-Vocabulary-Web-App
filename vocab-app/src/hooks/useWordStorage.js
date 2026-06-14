import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { createVocabularyWord } from '../domain/models';
import {
  updateUserLibraryFoldersByLibraryId,
  updateUserLibrarySourceByLibraryId,
  saveWordWithPreferences,
  deleteUserLibraryEntry,
  toggleUserLibraryStar
} from '../services/libraryService';
import { entryToWord } from '../utils/mapper';

const useWordStorage = ({
  session,
  folders,
  vocabData,
  setVocabData,
  showToast,
  pendingSavesRef,
  syncLockRef,
  isDataLoaded
}) => {
  const saveWordToFolder = useCallback(async (searchResult, folderId, selectedDefinitions = null, options = {}) => {
    if (!searchResult) return false;
    if (session?.user && !isDataLoaded) {
      showToast?.('資料載入中，請稍後再試', 'info');
      return false;
    }
    const showToastFlag = options?.showToast !== false;

    const folderName = folders.find(folder => folder.id === folderId)?.name || '資料夾';
    const normalizedFolderId = folderId?.toString();
    if (session?.user && normalizedFolderId) {
      const isKnownFolder = folders.some(folder => folder.id === normalizedFolderId);
      if (!isKnownFolder) {
        showToast?.('資料夾尚未同步，請重新選擇或刷新', 'error');
        return false;
      }
    }
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
      if (syncLockRef) syncLockRef.current += 1;
      if (!session) {
        let resultWord;
        if (existingWord) {
          const nextFolderIds = normalizedFolderId
            ? Array.from(new Set([...(existingWord.folderIds || []).map(id => id?.toString()), normalizedFolderId])).filter(Boolean)
            : (existingWord.folderIds || []);
          resultWord = createVocabularyWord({
            ...existingWord,
            folderIds: nextFolderIds,
            selectedDefinitions: normalizedSelectedDefinitions ?? existingWord.selectedDefinitions ?? null,
            source: existingWord.source ?? searchResult.source ?? null,
            isAiGenerated: existingWord.isAiGenerated ?? searchResult.isAiGenerated ?? false
          });
          setVocabData(prev => prev.map(word => word.id === existingWord.id ? { ...resultWord, isLocal: true } : word));
        } else {
          const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          resultWord = createVocabularyWord({
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
          setVocabData(prev => [...prev, { ...resultWord, isLocal: true }]);
        }
        if (showToastFlag) {
          toast.success('已暫存於本機 (訪客模式)');
        }
        return resultWord;
      }

      // Logged in mode - NO optimistic updates
      try {
        const { data, error } = await saveWordWithPreferences({
          wordData: existingWord ? { ...existingWord, source: searchResult.source, isAiGenerated: searchResult.isAiGenerated } : searchResult,
          userId: session.user.id,
          folderId: normalizedFolderId,
          selectedDefinitions
        });

        if (error) throw error;

        const libraryEntry = Array.isArray(data) ? data[0] : data;
        if (!libraryEntry) throw new Error("儲存失敗 (無回傳資料)");

        const reconciledWord = entryToWord({
          entry: libraryEntry,
          baseWord: existingWord || searchResult,
          normalizedFolderId,
          normalizedSelectedDefinitions,
          nowIso
        });

        if (libraryEntry?.id && searchResult?.source) {
          try {
            await updateUserLibrarySourceByLibraryId({
              libraryId: libraryEntry.id,
              source: searchResult.source,
              isAiGenerated: Boolean(searchResult.isAiGenerated)
            });
          } catch (error) {
            if (!error?.message?.includes('column "source"')) {
              console.warn('更新來源失敗', error);
            }
          }
        }

        setVocabData(prev => {
          const exists = prev.find(word => (word.word || '').toLowerCase() === (searchResult.word || '').toLowerCase());
          if (exists) {
            return prev.map(word => word.id === exists.id ? reconciledWord : word);
          }
          return [...prev, reconciledWord];
        });

        if (showToastFlag) {
          toast.success('已加入單字庫！');
        }
        return reconciledWord;
      } catch (error) {
        console.error("儲存失敗:", error);

        let message = error?.message || "請稍後再試";
        if (message.includes("row-level security")) {
          message = "資料庫權限不足。請在 Supabase SQL Editor 執行 RLS 政策指令以開放寫入權限。";
        } else if (message.includes('column "selected_definitions" of relation "user_library" does not exist')) {
          message = "資料庫尚未更新。請先新增 selected_definitions 欄位。";
        }
        console.error("儲存失敗細節:", message);
        toast.error('儲存失敗，請再試一次');
        return false;
      }
    } finally {
      pendingSavesRef.current.delete(pendingKey);
      if (syncLockRef) {
        syncLockRef.current = Math.max(0, syncLockRef.current - 1);
      }
    }
  }, [folders, pendingSavesRef, session, setVocabData, showToast, vocabData, syncLockRef]);

  const updateWordFolders = useCallback(async (word, folderIds) => {
    if (!word) return false;
    const normalizedFolderIds = (Array.isArray(folderIds) ? folderIds : [])
      .map(id => id?.toString())
      .filter(Boolean);

    try {
      if (syncLockRef) syncLockRef.current += 1;
      if (normalizedFolderIds.length === 0) {
        if (session?.user) {
          if (!word.libraryId) {
            throw new Error("找不到單字的 libraryId，無法刪除單字");
          }
          const { error } = await deleteUserLibraryEntry({
            userId: session.user.id,
            libraryId: word.libraryId
          });
          if (error) throw error;
        }
        setVocabData(prev => prev.filter(item => item.id !== word.id));
        return true;
      }

      if (session?.user) {
        if (!word.libraryId) {
          throw new Error("找不到單字的 libraryId，無法更新資料夾");
        }
        const { error } = await updateUserLibraryFoldersByLibraryId({
          userId: session.user.id,
          libraryId: word.libraryId,
          folderIds: normalizedFolderIds
        });

        if (error) throw error;
      }

      setVocabData(prev => prev.map(item => item.id === word.id ? { ...item, folderIds: normalizedFolderIds } : item));
      return true;
    } finally {
      if (syncLockRef) {
        syncLockRef.current = Math.max(0, syncLockRef.current - 1);
      }
    }
  }, [session, setVocabData, syncLockRef]);

  const handleRemoveWordFromFolder = useCallback(async (word, folderId) => {
    const currentFolders = Array.isArray(word.folderIds) ? word.folderIds.map(id => id?.toString()) : [];
    const normalizedFolderId = folderId?.toString();
    if (!normalizedFolderId || currentFolders.length === 0) return;

    if (!currentFolders.includes(normalizedFolderId)) return;

    const nextFolders = currentFolders.filter(id => id !== normalizedFolderId);

    try {
      if (syncLockRef) syncLockRef.current += 1;
      if (nextFolders.length === 0) {
        if (session?.user) {
          const { error } = await deleteUserLibraryEntry({
            userId: session.user.id,
            libraryId: word.libraryId
          });

          if (error) {
            alert("移除失敗: " + error.message);
            return;
          }
        }

        setVocabData(prev => prev.filter(item => item.id !== word.id));
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
    } finally {
      if (syncLockRef) {
        syncLockRef.current = Math.max(0, syncLockRef.current - 1);
      }
    }
  }, [session, setVocabData, syncLockRef]);

  const handleRemoveWordsFromFolder = useCallback(async (words, folderId) => {
    const normalizedFolderId = folderId?.toString();
    if (!normalizedFolderId) return false;
    const targets = Array.isArray(words) ? words : [];
    if (targets.length === 0) return false;

    try {
      if (syncLockRef) syncLockRef.current += 1;
      const updates = [];
      const deletes = new Set();
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
          
          let error;
          if (nextFolders.length === 0) {
            const res = await deleteUserLibraryEntry({
              userId: session.user.id,
              libraryId: word.libraryId
            });
            error = res.error;
          } else {
            const res = await updateUserLibraryFoldersByLibraryId({
              userId: session.user.id,
              libraryId: word.libraryId,
              folderIds: nextFolders
            });
            error = res.error;
          }

          if (error) {
            failed.push(word.id);
            continue;
          }
        }

        if (nextFolders.length === 0) {
          deletes.add(word.id);
        } else {
          updates.push({ id: word.id, folderIds: nextFolders });
        }
      }

      if (updates.length > 0 || deletes.size > 0) {
        setVocabData(prev => prev
          .filter(item => !deletes.has(item.id))
          .map(item => {
            const update = updates.find(entry => entry.id === item.id);
            return update ? { ...item, folderIds: update.folderIds } : item;
          })
        );
      }

      if (failed.length > 0) {
        alert(`移除失敗: ${failed.length} 個單字未更新`);
      }

      return updates.length > 0 || deletes.size > 0;
    } finally {
      if (syncLockRef) {
        syncLockRef.current = Math.max(0, syncLockRef.current - 1);
      }
    }
  }, [session, setVocabData, syncLockRef]);

  const handleMoveWordsToFolder = useCallback(async (words, fromFolderId, toFolderId) => {
    const normalizedFromId = fromFolderId?.toString();
    const normalizedToId = toFolderId?.toString();
    if (!normalizedFromId || !normalizedToId) return false;
    if (normalizedFromId === normalizedToId) return false;

    const targets = Array.isArray(words) ? words : [];
    if (targets.length === 0) return false;

    try {
      if (syncLockRef) syncLockRef.current += 1;
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
    } finally {
      if (syncLockRef) {
        syncLockRef.current = Math.max(0, syncLockRef.current - 1);
      }
    }
  }, [session, setVocabData, syncLockRef]);

  const updateWord = useCallback((wordId, updates) => {
    setVocabData(prev => prev.map(word => word.id === wordId ? { ...word, ...updates } : word));
  }, [setVocabData]);

  const toggleWordStar = useCallback(async (word) => {
    if (!word) return false;
    const nextStarred = !word.isStarred;
    
    setVocabData(prev => prev.map(item => item.id === word.id ? { ...item, isStarred: nextStarred } : item));
    
    if (session?.user) {
      if (!word.libraryId) {
        console.warn("找不到單字的 libraryId，無法更新星號至雲端");
        return false;
      }
      try {
        if (syncLockRef) syncLockRef.current += 1;
        const { error } = await toggleUserLibraryStar({
          libraryId: word.libraryId,
          isStarred: nextStarred
        });
        if (error) throw error;
      } catch (error) {
        console.error("同步星號狀態失敗:", error);
        setVocabData(prev => prev.map(item => item.id === word.id ? { ...item, isStarred: word.isStarred } : item));
        toast.error("星號同步失敗，請稍後再試");
        return false;
      } finally {
        if (syncLockRef) {
          syncLockRef.current = Math.max(0, syncLockRef.current - 1);
        }
      }
    } else {
      toast.success(nextStarred ? "已標註星號 (訪客模式)" : "已取消星號 (訪客模式)");
    }
    return true;
  }, [session, setVocabData, syncLockRef]);

  return {
    actions: {
      saveWordToFolder,
      updateWordFolders,
      handleRemoveWordFromFolder,
      handleRemoveWordsFromFolder,
      handleMoveWordsToFolder,
      updateWord,
      toggleWordStar
    },
    state: {
      vocabData
    }
  };
};

export default useWordStorage;
