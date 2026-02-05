import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  fetchFolders,
  fetchUserLibrary,
  saveWordWithPreferences,
  updateUserLibrarySourceByLibraryId
} from '../services/libraryService';
import { mapLibraryRowToWord } from '../domain/mappers/libraryMapper';
import { entryToWord } from '../utils/mapper';

const DEFAULT_FOLDERS = [{ id: 'default', name: '預設資料夾', words: [] }];

const useSync = ({ session, setFolders, setVocabData, vocabData }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const isSyncing = useRef(false);

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
      return true;
    } catch (error) {
      console.error("Supabase 載入失敗:", error);
      setIsDataLoaded(true);
      throw error;
    }
  }, [setFolders, setVocabData]);

  useEffect(() => {
    if (session?.user?.id) {
      loadData(session.user.id).catch(() => {});
    } else {
      setIsDataLoaded(true);
    }
  }, [loadData, session?.user?.id]);

  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!session?.user) return;
      setIsDataLoaded(false);
      loadData(session.user.id).catch(() => {});
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [loadData, session]);

  const syncLocalWords = useCallback(async () => {
    if (!session?.user?.id) return;
    if (isSyncing.current) return;

    const localWords = vocabData.filter(word => word.isLocal);
    if (localWords.length === 0) return;

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

        if (libraryEntry?.id && word?.source) {
          updateUserLibrarySourceByLibraryId({
            libraryId: libraryEntry.id,
            source: word.source,
            isAiGenerated: Boolean(word.isAiGenerated)
          }).catch((error) => {
            if (error?.message?.includes('column \"source\"')) return;
            console.warn('同步來源失敗', error);
          });
        }

        return { word, libraryEntry };
      }));

      const successfulUpdates = new Map();
      results.forEach((result, index) => {
        const sourceWord = localWords[index];
        if (!sourceWord) return;
        if (result.status === 'fulfilled') {
          successfulUpdates.set(
            sourceWord.id,
            entryToWord({
              entry: result.value.libraryEntry,
              baseWord: sourceWord,
              nowIso: sourceWord.addedAt || new Date().toISOString()
            })
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
  }, [session?.user?.id, setVocabData, vocabData]);

  useEffect(() => {
    if (session?.user?.id) {
      syncLocalWords();
    }
  }, [session?.user?.id, syncLocalWords]);

  const handleManualSync = useCallback(() => {
    if (session?.user) {
      setIsDataLoaded(false);
      loadData(session.user.id)
        .then(() => alert("同步完成！"))
        .catch((error) => {
          const message = error?.message || '請稍後再試';
          alert(`同步失敗: ${message}`);
        });
    } else {
      alert("請先登入才能同步資料！");
    }
  }, [loadData, session]);

  return {
    state: {
      isDataLoaded
    },
    actions: {
      loadData,
      syncLocalWords,
      handleManualSync
    }
  };
};

export default useSync;
