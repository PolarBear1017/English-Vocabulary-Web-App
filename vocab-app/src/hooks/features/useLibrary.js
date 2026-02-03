import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchStory } from '../../services/aiService';
import useLibraryIndex from './useLibraryIndex';
import useFolderCRUD from '../useFolderCRUD';
import useWordStorage from '../useWordStorage';
import useSync from '../useSync';

const useLibrary = ({ session, apiKeys, showToast, onRequireApiKeys }) => {
  const [folders, setFolders] = useState(() => loadCachedFolders());
  const [vocabData, setVocabData] = useState(() => loadCachedVocab());
  const [viewingFolderId, setViewingFolderId] = useState(null);
  const [story, setStory] = useState(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [folderSortBy, setFolderSortBy] = useState(() => loadFolderSortBy());
  const [wordSortBy, setWordSortBy] = useState(() => loadWordSortBy());
  const [lastUsedFolderIds, setLastUsedFolderIds] = useState(() => loadLastUsedFolders());
  const pendingSavesRef = useRef(new Set());

  const index = useLibraryIndex({ folders, vocabData });

  const { actions: folderActions } = useFolderCRUD({
    session,
    folders,
    setFolders,
    viewingFolderId,
    setViewingFolderId
  });

  const { actions: wordActions } = useWordStorage({
    session,
    folders,
    vocabData,
    setVocabData,
    showToast,
    pendingSavesRef
  });

  const sync = useSync({
    session,
    setFolders,
    setVocabData,
    vocabData
  });

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

  const generateFolderStory = useCallback(async (folder) => {
    if (!apiKeys?.groqKey) {
      if (onRequireApiKeys) onRequireApiKeys();
      alert("請先設定 Groq API Key 才能使用故事生成功能！");
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
      isDataLoaded: sync.state.isDataLoaded,
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
      loadData: sync.actions.loadData,
      handleManualSync: sync.actions.handleManualSync,
      createFolder: folderActions.createFolder,
      handleDeleteFolder: folderActions.handleDeleteFolder,
      handleDeleteFolders: folderActions.handleDeleteFolders,
      handleEditFolder: folderActions.handleEditFolder,
      saveWordToFolder: wordActions.saveWordToFolder,
      handleRemoveWordFromFolder: wordActions.handleRemoveWordFromFolder,
      handleRemoveWordsFromFolder: wordActions.handleRemoveWordsFromFolder,
      handleMoveWordsToFolder: wordActions.handleMoveWordsToFolder,
      generateFolderStory,
      updateWord: wordActions.updateWord,
      updateLastUsedFolderIds
    }
  };
};

export default useLibrary;
