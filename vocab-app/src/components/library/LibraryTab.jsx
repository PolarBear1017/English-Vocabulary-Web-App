import React, { useEffect, useState } from 'react';
import LibraryOverview from './LibraryOverview';
import FolderDetail from './FolderDetail';
import StoryModal from './StoryModal';
import FolderFormModal from './FolderFormModal';
import MoveWordsModal from './MoveWordsModal';
import SelectionActionBar from './SelectionActionBar';
import { useLibraryContext } from '../../contexts/LibraryContext';
import { useReviewContext } from '../../contexts/ReviewContext';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useSearchContext } from '../../contexts/SearchContext';
import useSelection from '../../hooks/useSelection';
import useDragSelect from '../../hooks/useDragSelect';

const LibraryTab = () => {
  const library = useLibraryContext();
  const review = useReviewContext();
  const navigation = useNavigationContext();
  const search = useSearchContext();

  const {
    activeFolder,
    sortedFolders,
    sortedActiveFolderWords,
    index
  } = library.derived;

  const {
    folderSortBy,
    wordSortBy,
    story,
    isGeneratingStory,
    isDataLoaded,
    folders
  } = library.state;

  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMovingWords, setIsMovingWords] = useState(false);

  const {
    isSelectionMode: isFolderSelectionMode,
    selectedIds: selectedFolderIds,
    count: selectedFolderCount,
    enterSelectionMode: enterFolderSelectionMode,
    exitSelectionMode: exitFolderSelectionMode,
    toggleSelectionMode: toggleFolderSelectionMode,
    toggleSelection: toggleFolderSelection,
    setSelection: setFolderSelection
  } = useSelection();
  const {
    isSelectionMode: isWordSelectionMode,
    selectedIds: selectedWordIds,
    count: selectedWordCount,
    enterSelectionMode: enterWordSelectionMode,
    exitSelectionMode: exitWordSelectionMode,
    toggleSelectionMode: toggleWordSelectionMode,
    toggleSelection: toggleWordSelection,
    setSelection: setWordSelection
  } = useSelection();

  useEffect(() => {
    exitWordSelectionMode();
  }, [activeFolder?.id, exitWordSelectionMode]);

  useEffect(() => {
    const validFolderIds = new Set(sortedFolders.map(folder => folder.id));
    const nextSelection = selectedFolderIds.filter(id => validFolderIds.has(id));
    if (nextSelection.length !== selectedFolderIds.length) {
      setFolderSelection(nextSelection);
    }
  }, [sortedFolders, selectedFolderIds, setFolderSelection]);

  useEffect(() => {
    const validWordIds = new Set(sortedActiveFolderWords.map(word => word.id));
    const nextSelection = selectedWordIds.filter(id => validWordIds.has(id));
    if (nextSelection.length !== selectedWordIds.length) {
      setWordSelection(nextSelection);
    }
  }, [sortedActiveFolderWords, selectedWordIds, setWordSelection]);

  const openCreateFolder = () => {
    setEditingFolder(null);
    setIsFolderFormOpen(true);
  };

  const openEditFolder = (folder) => {
    setEditingFolder(folder);
    setIsFolderFormOpen(true);
  };

  const handleSubmitFolder = async (values) => {
    setIsSavingFolder(true);
    const success = editingFolder
      ? await library.actions.handleEditFolder(editingFolder, values)
      : await library.actions.createFolder(values);
    setIsSavingFolder(false);
    if (success) {
      setIsFolderFormOpen(false);
      setEditingFolder(null);
    }
  };

  const selectAllFolders = () => {
    const selectableIds = sortedFolders.filter(folder => folder.id !== 'default').map(folder => folder.id);
    if (selectedFolderIds.length === selectableIds.length) {
      setFolderSelection([]);
      return;
    }
    setFolderSelection(selectableIds);
  };

  const selectFolderId = (folderId) => {
    if (!folderId || folderId === 'default') return;
    if (!selectedFolderIds.includes(folderId)) {
      toggleFolderSelection(folderId);
    }
  };

  const deleteSelectedFolders = async () => {
    const deletableIds = selectedFolderIds.filter(id => id !== 'default');
    if (deletableIds.length === 0) {
      alert('請先選取可刪除的資料夾');
      return;
    }
    if (!confirm(`確定刪除選取的 ${deletableIds.length} 個資料夾？(資料夾內的單字不會被刪除，只會移除分類)`)) {
      return;
    }
    const success = await library.actions.handleDeleteFolders(deletableIds);
    if (success) exitFolderSelectionMode();
  };

  const selectAllWords = () => {
    const wordIds = sortedActiveFolderWords.map(word => word.id);
    if (selectedWordIds.length === wordIds.length) {
      setWordSelection([]);
      return;
    }
    setWordSelection(wordIds);
  };

  const selectWordId = (wordId) => {
    if (!wordId) return;
    if (!selectedWordIds.includes(wordId)) {
      toggleWordSelection(wordId);
    }
  };

  const handleFolderToggle = (folderId, event) => {
    toggleFolderSelection(folderId, event, sortedFolders);
  };

  const handleWordToggle = (wordId, event) => {
    toggleWordSelection(wordId, event, sortedActiveFolderWords);
  };

  const removeSelectedWords = async () => {
    if (!activeFolder) return;
    const selectedWords = sortedActiveFolderWords.filter(word => selectedWordIds.includes(word.id));
    if (selectedWords.length === 0) {
      alert('請先選取要移除的單字');
      return;
    }
    if (!confirm(`確定移除選取的 ${selectedWords.length} 個單字？`)) {
      return;
    }
    const success = await library.actions.handleRemoveWordsFromFolder(selectedWords, activeFolder.id);
    if (success) exitWordSelectionMode();
  };

  const openMoveModal = () => {
    if (!activeFolder) return;
    if (selectedWordIds.length === 0) {
      alert('請先選取要移動的單字');
      return;
    }
    const availableTargets = folders.filter(folder => folder.id !== activeFolder.id);
    if (availableTargets.length === 0) {
      alert('目前沒有可移動的目標資料夾');
      return;
    }
    setIsMoveModalOpen(true);
  };

  const handleMoveWords = async (targetFolderId) => {
    if (!activeFolder) return;
    const selectedWords = sortedActiveFolderWords.filter(word => selectedWordIds.includes(word.id));
    if (selectedWords.length === 0) return;
    setIsMovingWords(true);
    const success = await library.actions.handleMoveWordsToFolder(selectedWords, activeFolder.id, targetFolderId);
    setIsMovingWords(false);
    if (success) {
      setIsMoveModalOpen(false);
      exitWordSelectionMode();
    }
  };

  const folderDrag = useDragSelect({
    enabled: isFolderSelectionMode,
    onSelect: selectFolderId,
    onToggle: handleFolderToggle
  });

  const wordDrag = useDragSelect({
    enabled: isWordSelectionMode,
    onSelect: selectWordId,
    onToggle: handleWordToggle
  });

  return (
    <div className="max-w-4xl mx-auto">
      {!activeFolder ? (
        <LibraryOverview
          sortedFolders={sortedFolders}
          folderSortBy={folderSortBy}
          setFolderSortBy={library.actions.setFolderSortBy}
          onOpenCreateFolder={openCreateFolder}
          handleManualSync={library.actions.handleManualSync}
          isDataLoaded={isDataLoaded}
          isSelectionMode={isFolderSelectionMode}
          onToggleSelectionMode={toggleFolderSelectionMode}
          setSelectedReviewFolders={review.actions.setSelectedReviewFolders}
          setReviewSetupView={review.actions.setReviewSetupView}
          setActiveTab={navigation.actions.setActiveTab}
          generateFolderStory={library.actions.generateFolderStory}
          handleDeleteFolder={library.actions.handleDeleteFolder}
          handleEditFolder={openEditFolder}
          setViewingFolderId={library.actions.setViewingFolderId}
          selectedFolderIds={selectedFolderIds}
          onToggleFolder={handleFolderToggle}
          onEnterSelectionMode={enterFolderSelectionMode}
          dragHandleProps={folderDrag.dragHandleProps}
          entriesByFolderId={index.entriesByFolderId}
          statsByFolderId={index.statsByFolderId}
        />
      ) : (
        <FolderDetail
          activeFolder={activeFolder}
          wordSortBy={wordSortBy}
          setWordSortBy={library.actions.setWordSortBy}
          sortedActiveFolderWords={sortedActiveFolderWords}
          activeFolderStats={index.statsByFolderId[activeFolder.id]}
          onBack={() => library.actions.setViewingFolderId(null)}
          isSelectionMode={isWordSelectionMode}
          onToggleSelectionMode={toggleWordSelectionMode}
          onEditFolder={() => openEditFolder(activeFolder)}
          onDeleteFolder={() => library.actions.handleDeleteFolder(activeFolder.id)}
          selectedWordIds={selectedWordIds}
          onToggleWord={handleWordToggle}
          onEnterSelectionMode={enterWordSelectionMode}
          dragHandleProps={wordDrag.dragHandleProps}
          onRemoveWordFromFolder={library.actions.handleRemoveWordFromFolder}
          onGoSearch={() => {
            navigation.actions.setActiveTab('search');
            library.actions.setViewingFolderId(null);
          }}
          onSearchWord={(word) => {
            navigation.actions.setActiveTab('search');
            library.actions.setViewingFolderId(null);
            search.actions.handleSearch(word);
            if (activeFolder?.id) {
              navigation.actions.setReturnFolderId(activeFolder.id);
            }
          }}
        />
      )}

      {(story || isGeneratingStory) && (
        <StoryModal
          story={story}
          isGeneratingStory={isGeneratingStory}
          onClose={() => { library.actions.setStory(null); library.actions.setIsGeneratingStory(false); }}
        />
      )}

      {isFolderFormOpen && (
        <FolderFormModal
          title={editingFolder ? '編輯資料夾' : '新增資料夾'}
          initialValues={editingFolder || { name: '', description: '' }}
          onSubmit={handleSubmitFolder}
          onClose={() => {
            if (!isSavingFolder) {
              setIsFolderFormOpen(false);
              setEditingFolder(null);
            }
          }}
          isSaving={isSavingFolder}
        />
      )}

      {isMoveModalOpen && (
        <MoveWordsModal
          folders={folders}
          currentFolderId={activeFolder?.id}
          onSubmit={handleMoveWords}
          onClose={() => {
            if (!isMovingWords) setIsMoveModalOpen(false);
          }}
          isSaving={isMovingWords}
        />
      )}

      {!activeFolder && isFolderSelectionMode && (
        <SelectionActionBar
          count={selectedFolderCount}
          onSelectAll={selectAllFolders}
          selectAllLabel={selectedFolderIds.length === sortedFolders.filter(folder => folder.id !== 'default').length ? '取消全選' : '全選'}
          onClear={exitFolderSelectionMode}
          actions={[
            { key: 'delete', label: '刪除', variant: 'danger', onClick: deleteSelectedFolders, icon: 'delete', disabled: selectedFolderCount === 0 }
          ]}
        />
      )}

      {activeFolder && isWordSelectionMode && (
        <SelectionActionBar
          count={selectedWordCount}
          onSelectAll={selectAllWords}
          selectAllLabel={selectedWordIds.length === sortedActiveFolderWords.length ? '取消全選' : '全選'}
          onClear={exitWordSelectionMode}
          actions={[
            { key: 'move', label: '移動', variant: 'primary', onClick: openMoveModal, icon: 'move', disabled: selectedWordCount === 0 },
            { key: 'remove', label: '移除', variant: 'danger', onClick: removeSelectedWords, icon: 'delete', disabled: selectedWordCount === 0 }
          ]}
        />
      )}
    </div>
  );
};

export default LibraryTab;
