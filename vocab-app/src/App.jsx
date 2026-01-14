import React, { useMemo } from 'react';
import useVocabularyApp from './hooks/useVocabularyApp';
import Navigation from './components/layout/Navigation';
import SearchTab from './components/search/SearchTab';
import LibraryTab from './components/library/LibraryTab';
import SettingsTab from './components/settings/SettingsTab';
import ReviewPage from './pages/ReviewPage';
import Toast from './components/common/Toast';
import { NavigationContext } from './contexts/NavigationContext';
import { SettingsContext } from './contexts/SettingsContext';
import { LibraryContext } from './contexts/LibraryContext';
import { SearchContext } from './contexts/SearchContext';
import { ReviewContext } from './contexts/ReviewContext';
import { PreferencesContext } from './contexts/PreferencesContext';

export default function VocabularyApp() {
  const app = useVocabularyApp();

  const tabMap = useMemo(() => ({
    search: SearchTab,
    library: LibraryTab,
    review: ReviewPage,
    review_session: ReviewPage,
    settings: SettingsTab
  }), []);

  const ActivePage = tabMap[app.navigation.state.activeTab] || SearchTab;

  return (
    <NavigationContext.Provider value={app.navigation}>
      <SettingsContext.Provider value={app.settings}>
        <PreferencesContext.Provider value={app.preferences}>
          <LibraryContext.Provider value={app.library}>
            <SearchContext.Provider value={app.search}>
              <ReviewContext.Provider value={app.review}>
                <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800 font-sans pb-16 md:pb-0">
                  <Navigation />
                  <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <ActivePage />
                    <Toast toast={app.toast.toast} />
                  </main>
                </div>
              </ReviewContext.Provider>
            </SearchContext.Provider>
          </LibraryContext.Provider>
        </PreferencesContext.Provider>
      </SettingsContext.Provider>
    </NavigationContext.Provider>
  );
}
