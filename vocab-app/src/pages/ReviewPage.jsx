
import React, { useContext, useMemo } from 'react';
import { ReviewContext } from '../contexts/ReviewContext';
import { LibraryContext } from '../contexts/LibraryContext';
import { NavigationContext } from '../contexts/NavigationContext';
import { PreferencesContext } from '../contexts/PreferencesContext';
import ReviewSetup from '../components/review/ReviewSetup';
import ReviewSession from '../components/review/ReviewSession';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ReviewPage Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">發生錯誤</h2>
                    <p className="text-gray-600 mb-4">無法載入複習模式</p>
                    <pre className="text-left bg-gray-100 p-4 rounded overflow-auto text-xs mb-4">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        重新整理
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const ReviewPage = () => {
    const { state: reviewState, derived: reviewDerived, actions: reviewActions } = useContext(ReviewContext);
    const { state: libraryState, derived: libraryDerived } = useContext(LibraryContext);
    const { state: navState, actions: navActions } = useContext(NavigationContext);
    const preferences = useContext(PreferencesContext);

    const activeTab = navState.activeTab;

    const filteredWords = useMemo(() => {
        const { selectedReviewFolders } = reviewState;
        if (!selectedReviewFolders || selectedReviewFolders.includes('all')) {
            return libraryState.vocabData;
        }
        return libraryState.vocabData.filter(word =>
            word.folderIds && word.folderIds.some(id => selectedReviewFolders.includes(id))
        );
    }, [libraryState.vocabData, reviewState.selectedReviewFolders]);

    const dueCount = useMemo(() => {
        return filteredWords.filter(word => new Date(word.nextReview) <= new Date()).length;
    }, [filteredWords]);

    const totalWords = filteredWords.length;

    if (activeTab === 'review_session') {
        return (
            <ErrorBoundary>
                <ReviewSession
                    {...reviewState}
                    {...reviewDerived}
                    {...reviewActions}
                    setActiveTab={navActions.setActiveTab}
                    preferredAccent={preferences?.state?.preferredAccent || 'us'}
                    setPreferredAccent={preferences?.actions?.setPreferredAccent}
                />
            </ErrorBoundary>
        );
    }

    const foldersWithStats = useMemo(() => {
        if (!libraryState.folders || !libraryDerived?.index?.statsByFolderId) {
            return libraryState.folders || [];
        }
        return libraryState.folders.map(folder => {
            const stats = libraryDerived.index.statsByFolderId[folder.id];
            return {
                ...folder,
                wordCount: stats?.count || 0,
                dueCount: stats?.dueCount || 0
            };
        });
    }, [libraryState.folders, libraryDerived?.index?.statsByFolderId]);

    return (
        <ReviewSetup
            {...reviewState}
            {...reviewDerived}
            {...reviewActions}
            dueCount={dueCount}
            totalWords={totalWords}
            sortedFolders={foldersWithStats}
            allFolderIds={libraryDerived?.index?.allFolderIds || []}
        />
    );
};

export default ReviewPage;
