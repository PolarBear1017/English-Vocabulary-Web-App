import { useMemo } from 'react';
import { isReviewDue } from '../../utils/data';

const useLibraryIndex = ({ folders, vocabData }) => {
  const allFolderIds = useMemo(() => folders.map(folder => folder.id), [folders]);

  const entriesByFolderId = useMemo(() => {
    const map = {};
    folders.forEach(folder => {
      map[folder.id] = [];
    });
    vocabData.forEach(word => {
      const folderIds = Array.isArray(word.folderIds) ? word.folderIds : [];
      if (folderIds.length === 0) return;
      folderIds.forEach(folderId => {
        if (!map[folderId]) map[folderId] = [];
        map[folderId].push(word);
      });
    });
    return map;
  }, [folders, vocabData]);

  const statsByFolderId = useMemo(() => {
    const stats = {};
    folders.forEach(folder => {
      const words = entriesByFolderId[folder.id] || [];
      stats[folder.id] = {
        count: words.length,
        dueCount: words.filter(word => isReviewDue(word.nextReview)).length
      };
    });
    return stats;
  }, [folders, entriesByFolderId]);

  const wordById = useMemo(() => {
    const map = new Map();
    vocabData.forEach(word => {
      map.set(word.id, word);
    });
    return map;
  }, [vocabData]);

  const wordByText = useMemo(() => {
    const map = new Map();
    vocabData.forEach(word => {
      if (word.word) {
        map.set(word.word, word);
      }
    });
    return map;
  }, [vocabData]);

  const dueCount = useMemo(() => vocabData.filter(word => isReviewDue(word.nextReview)).length, [vocabData]);

  return {
    allFolderIds,
    entriesByFolderId,
    statsByFolderId,
    wordById,
    wordByText,
    dueCount,
    totalWords: vocabData.length
  };
};

export default useLibraryIndex;
