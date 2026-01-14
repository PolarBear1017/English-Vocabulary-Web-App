import React from 'react';
import LibraryOverview from './LibraryOverview';
import FolderDetail from './FolderDetail';
import StoryModal from './StoryModal';
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

  return (
    <div className="max-w-4xl mx-auto">
      {!activeFolder ? (
        <LibraryOverview
          sortedFolders={sortedFolders}
          folderSortBy={folderSortBy}
          setFolderSortBy={library.actions.setFolderSortBy}
          createFolder={library.actions.createFolder}
          handleManualSync={library.actions.handleManualSync}
          isDataLoaded={isDataLoaded}
          setSelectedReviewFolders={review.actions.setSelectedReviewFolders}
          setReviewSetupView={review.actions.setReviewSetupView}
          setActiveTab={navigation.actions.setActiveTab}
          generateFolderStory={library.actions.generateFolderStory}
          handleDeleteFolder={library.actions.handleDeleteFolder}
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
    </div>
  );
};

export default LibraryTab;
