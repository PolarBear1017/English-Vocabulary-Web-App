import React from 'react';
import useVocabularyApp from './hooks/useVocabularyApp';
import Navigation from './components/layout/Navigation';
import SearchTab from './components/search/SearchTab';
import LibraryTab from './components/library/LibraryTab';
import ReviewSetup from './components/review/ReviewSetup';
import ReviewSession from './components/review/ReviewSession';
import SettingsTab from './components/settings/SettingsTab';
import Toast from './components/common/Toast';

export default function VocabularyApp() {
  const app = useVocabularyApp();
  const { state, derived, actions } = app;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800 font-sans pb-16 md:pb-0">
      <Navigation
        activeTab={state.activeTab}
        setActiveTab={actions.setActiveTab}
        setViewingFolderId={actions.setViewingFolderId}
        setSettingsView={actions.setSettingsView}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {state.activeTab === 'search' && (
          <SearchTab app={app} />
        )}

        {state.activeTab === 'library' && (
          <LibraryTab app={app} />
        )}

        {state.activeTab === 'review' && (
          <div className="max-w-2xl mx-auto">
            <ReviewSetup
              reviewSetupView={state.reviewSetupView}
              setReviewSetupView={actions.setReviewSetupView}
              vocabData={state.vocabData}
              selectedFolderLabel={derived.selectedFolderLabel}
              selectedReviewFolders={state.selectedReviewFolders}
              startReview={actions.startReview}
              sortedFolders={derived.sortedFolders}
              allFoldersSelected={derived.allFoldersSelected}
              toggleReviewFolder={actions.toggleReviewFolder}
              allFolderIds={derived.allFolderIds}
              setSelectedReviewFolders={actions.setSelectedReviewFolders}
            />
          </div>
        )}

        {state.activeTab === 'review_session' && state.reviewQueue.length > 0 && (
          <ReviewSession
            reviewQueue={state.reviewQueue}
            currentCardIndex={state.currentCardIndex}
            reviewMode={state.reviewMode}
            isFlipped={state.isFlipped}
            userAnswer={state.userAnswer}
            feedback={state.feedback}
            isAwaitingNext={state.isAwaitingNext}
            answerHint={state.answerHint}
            currentReviewWord={derived.currentReviewWord}
            currentReviewEntries={derived.currentReviewEntries}
            primaryReviewEntry={derived.primaryReviewEntry}
            clozeExampleMain={derived.clozeExampleMain}
            clozeTranslation={derived.clozeTranslation}
            preferredReviewAudio={derived.preferredReviewAudio}
            preferredAccent={state.preferredAccent}
            setPreferredAccent={actions.setPreferredAccent}
            setActiveTab={actions.setActiveTab}
            setIsFlipped={actions.setIsFlipped}
            handleAnswerChange={actions.handleAnswerChange}
            checkAnswer={actions.checkAnswer}
            processRating={actions.processRating}
            advanceToNextCard={actions.advanceToNextCard}
          />
        )}

        {state.activeTab === 'settings' && (
          <SettingsTab app={app} />
        )}

        <Toast toast={state.toast} />
      </main>
    </div>
  );
}
