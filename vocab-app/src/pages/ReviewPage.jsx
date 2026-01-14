import React from 'react';
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

  if (navigation.state.activeTab === 'review_session' && review.state.reviewQueue.length > 0) {
    return (
      <ReviewSession
        reviewQueue={review.state.reviewQueue}
        currentCardIndex={review.state.currentCardIndex}
        reviewMode={review.state.reviewMode}
        isFlipped={review.state.isFlipped}
        userAnswer={review.state.userAnswer}
        feedback={review.state.feedback}
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
        dueCount={library.derived.index.dueCount}
        totalWords={library.derived.index.totalWords}
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
