import React, { useMemo } from 'react';
import { isReviewDue } from '../utils/data';
import ReviewSetup from '../components/review/ReviewSetup';
import ReviewSession from '../components/review/ReviewSession';
import { useReviewContext } from '../contexts/ReviewContext';
import { useLibraryContext } from '../contexts/LibraryContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';

const ReviewPage = () => {
  const review = useReviewContext();
  const library = useLibraryContext();
  const navigation = useNavigationContext();
  const preferences = usePreferencesContext();

  const {
    displayDueCount,
    displayTotalWords
  } = useMemo(() => {
    const allSelected = review.state.selectedReviewFolders.includes('all');
    if (allSelected) {
      return {
        displayDueCount: library.derived.index.dueCount,
        displayTotalWords: library.derived.index.totalWords
      };
    }

    const selectedFolderIds = review.state.selectedReviewFolders;
    // Filter vocabData to find words in selected folders
    // A word might be in multiple folders, but vocabData is a flat list of unique words
    // We just need to check if any of the word's folderIds are in the selectedFolderIds
    const filteredWords = library.state.vocabData.filter(word => {
      if (!word.folderIds || !Array.isArray(word.folderIds)) return false;
      return word.folderIds.some(id => selectedFolderIds.includes(id));
    });

    return {
      displayDueCount: filteredWords.filter(word => isReviewDue(word.nextReview)).length,
      displayTotalWords: filteredWords.length
    };
  }, [
    review.state.selectedReviewFolders,
    library.derived.index.dueCount,
    library.derived.index.totalWords,
    library.state.vocabData
  ]);

  if (navigation.state.activeTab === 'review_session' && review.state.reviewQueue.length > 0) {
    return (
      <ReviewSession
        reviewQueue={review.state.reviewQueue}
        currentCardIndex={review.state.currentCardIndex}
        reviewMode={review.state.reviewMode}
        isFlipped={review.state.isFlipped}
        userAnswer={review.state.userAnswer}
        feedback={review.state.feedback}
        lastResult={review.state.lastResult}
        isAwaitingNext={review.state.isAwaitingNext}
        answerHint={review.state.answerHint}
        currentReviewWord={review.derived.currentReviewWord}
        currentReviewEntries={review.derived.currentReviewEntries}
        primaryReviewEntry={review.derived.primaryReviewEntry}
        clozeExampleMain={review.derived.clozeExampleMain}
        clozeTranslation={review.derived.clozeTranslation}
        preferredReviewAudio={review.derived.preferredReviewAudio}
        preferredAccent={preferences.state.preferredAccent}
        setPreferredAccent={preferences.actions.setPreferredAccent}
        setActiveTab={navigation.actions.setActiveTab}
        setIsFlipped={review.actions.setIsFlipped}
        handleAnswerChange={review.actions.handleAnswerChange}
        checkAnswer={review.actions.checkAnswer}
        processRating={review.actions.processRating}
        advanceToNextCard={review.actions.advanceToNextCard}
        giveHint={review.actions.giveHint}
      />
    );
  }

  if (navigation.state.activeTab === 'review_session') {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ReviewSetup
        reviewSetupView={review.state.reviewSetupView}
        setReviewSetupView={review.actions.setReviewSetupView}
        dueCount={displayDueCount}
        totalWords={displayTotalWords}
        selectedFolderLabel={review.derived.selectedFolderLabel}
        selectedReviewFolders={review.state.selectedReviewFolders}
        startReview={review.actions.startReview}
        sortedFolders={library.derived.sortedFolders}
        allFoldersSelected={review.derived.allFoldersSelected}
        toggleReviewFolder={review.actions.toggleReviewFolder}
        allFolderIds={library.derived.index.allFolderIds}
        setSelectedReviewFolders={review.actions.setSelectedReviewFolders}
      />
    </div>
  );
};

export default ReviewPage;
