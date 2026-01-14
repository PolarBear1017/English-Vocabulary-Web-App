import React from 'react';
import LibraryOverview from './LibraryOverview';
import FolderDetail from './FolderDetail';
import StoryModal from './StoryModal';

const LibraryTab = ({ app }) => {
  const { state, derived, actions } = app;
  const {
    activeFolder,
    sortedFolders,
    sortedActiveFolderWords
  } = derived;
  const {
    folders,
    vocabData,
    folderSortBy,
    wordSortBy,
    story,
    isGeneratingStory,
    isDataLoaded
  } = state;
  const {
    setViewingFolderId,
    setSelectedReviewFolders,
    setReviewSetupView,
    setActiveTab,
    setFolderSortBy,
    setWordSortBy,
    createFolder,
    handleManualSync,
    generateFolderStory,
    handleDeleteFolder,
    handleShowDetails,
    handleRemoveWordFromFolder,
    setStory,
    setIsGeneratingStory
  } = actions;

  return (
    <div className="max-w-4xl mx-auto">
      {!activeFolder ? (
        <LibraryOverview
          sortedFolders={sortedFolders}
          vocabData={vocabData}
          folderSortBy={folderSortBy}
          setFolderSortBy={setFolderSortBy}
          createFolder={createFolder}
          handleManualSync={handleManualSync}
          isDataLoaded={isDataLoaded}
          setSelectedReviewFolders={setSelectedReviewFolders}
          setReviewSetupView={setReviewSetupView}
          setActiveTab={setActiveTab}
          generateFolderStory={generateFolderStory}
          handleDeleteFolder={handleDeleteFolder}
          setViewingFolderId={setViewingFolderId}
        />
      ) : (
        <FolderDetail
          activeFolder={activeFolder}
          vocabData={vocabData}
          wordSortBy={wordSortBy}
          setWordSortBy={setWordSortBy}
          sortedActiveFolderWords={sortedActiveFolderWords}
          onBack={() => setViewingFolderId(null)}
          onShowDetails={handleShowDetails}
          onRemoveWordFromFolder={handleRemoveWordFromFolder}
          onGoSearch={() => { setActiveTab('search'); setViewingFolderId(null); }}
        />
      )}

      {(story || isGeneratingStory) && (
        <StoryModal
          story={story}
          isGeneratingStory={isGeneratingStory}
          onClose={() => { setStory(null); setIsGeneratingStory(false); }}
        />
      )}
    </div>
  );
};

export default LibraryTab;
