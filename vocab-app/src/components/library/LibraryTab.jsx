import React, { useState } from 'react';
import LibraryOverview from './LibraryOverview';
import FolderDetail from './FolderDetail';
import StoryModal from './StoryModal';
import FolderFormModal from './FolderFormModal';
import { useLibraryContext } from '../../contexts/LibraryContext';
import { useReviewContext } from '../../contexts/ReviewContext';
import { useNavigationContext } from '../../contexts/NavigationContext';

const LibraryTab = () => {
  const library = useLibraryContext();
  const review = useReviewContext();
  const navigation = useNavigationContext();

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
    isDataLoaded
  } = library.state;

  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [isSavingFolder, setIsSavingFolder] = useState(false);

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
          setSelectedReviewFolders={review.actions.setSelectedReviewFolders}
          setReviewSetupView={review.actions.setReviewSetupView}
          setActiveTab={navigation.actions.setActiveTab}
          generateFolderStory={library.actions.generateFolderStory}
          handleDeleteFolder={library.actions.handleDeleteFolder}
          handleEditFolder={openEditFolder}
          setViewingFolderId={library.actions.setViewingFolderId}
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
          onEditFolder={() => openEditFolder(activeFolder)}
          onDeleteFolder={() => library.actions.handleDeleteFolder(activeFolder.id)}
          onShowDetails={library.actions.openWordDetails}
          onRemoveWordFromFolder={library.actions.handleRemoveWordFromFolder}
          onGoSearch={() => {
            navigation.actions.setActiveTab('search');
            library.actions.setViewingFolderId(null);
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
    </div>
  );
};

export default LibraryTab;
