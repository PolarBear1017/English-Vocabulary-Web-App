import React, { useMemo } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import SearchForm from './SearchForm';
import SearchResultCard from './SearchResultCard';
import { speak } from '../../services/speechService';
import { useSearchContext } from '../../contexts/SearchContext';
import { useLibraryContext } from '../../contexts/LibraryContext';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { usePreferencesContext } from '../../contexts/PreferencesContext';

const SearchTab = () => {
  const search = useSearchContext();
  const library = useLibraryContext();
  const navigation = useNavigationContext();
  const settings = useSettingsContext();
  const preferences = usePreferencesContext();

  const { apiKey, groqApiKey } = settings.state;
  const { preferredAccent } = preferences.state;

  const {
    query,
    searchResult,
    searchError,
    isSearching,
    aiLoading,
    suggestions,
    isSaveMenuOpen,
    saveButtonFeedback
  } = search.state;

  const { normalizedEntries } = search.derived;

  const {
    folders,
    isDataLoaded
  } = library.state;

  const { returnFolderId } = navigation.state;

  const preferredSearchAudio = useMemo(() => {
    if (!searchResult) return null;
    return preferredAccent === 'uk'
      ? (searchResult.ukAudioUrl || searchResult.audioUrl || searchResult.usAudioUrl)
      : (searchResult.usAudioUrl || searchResult.audioUrl || searchResult.ukAudioUrl);
  }, [preferredAccent, searchResult]);

  const savedWordInSearch = useMemo(() => {
    if (!searchResult) return null;
    return library.derived.index.wordByText.get(searchResult.word) || null;
  }, [library.derived.index.wordByText, searchResult]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {returnFolderId && (
        <button
          onClick={() => {
            library.actions.setViewingFolderId(returnFolderId);
            navigation.actions.setActiveTab('library');
            navigation.actions.setReturnFolderId(null);
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition font-medium mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 {folders.find(folder => folder.id === returnFolderId)?.name || '資料夾'}
        </button>
      )}

      <header>
        <h1 className="text-2xl font-bold mb-2">單字查詢</h1>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          {(apiKey || groqApiKey) && (
            <span className="text-green-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI 功能已啟用</span>
          )}
        </div>
      </header>

      <div className="flex justify-end px-2">
        <span className={`text-xs flex items-center gap-1 ${isDataLoaded ? 'text-green-500' : 'text-gray-400'}`}>
          {isDataLoaded ? '☁️ 雲端同步中' : '⏳ 正在連線資料庫...'}
        </span>
      </div>

      <SearchForm
        query={query}
        onQueryChange={search.actions.setQuery}
        onSearch={search.actions.handleSearch}
        suggestions={suggestions}
        setSuggestions={search.actions.setSuggestions}
        isSearching={isSearching}
        inputRef={search.refs.searchInputRef}
      />

      {searchError && <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{searchError}</div>}

      {searchResult && !isSearching && (
        <SearchResultCard
          searchResult={searchResult}
          normalizedEntries={normalizedEntries}
          preferredAccent={preferredAccent}
          setPreferredAccent={preferences.actions.setPreferredAccent}
          preferredSearchAudio={preferredSearchAudio}
          onSpeak={speak}
          savedWordInSearch={savedWordInSearch}
          saveButtonFeedback={saveButtonFeedback}
          isSaveMenuOpen={isSaveMenuOpen}
          setIsSaveMenuOpen={search.actions.setIsSaveMenuOpen}
          folders={folders}
          onSaveWord={search.actions.saveFromSearch}
          onRemoveWordFromFolder={library.actions.handleRemoveWordFromFolder}
          apiKey={apiKey}
          aiLoading={aiLoading}
          onGenerateMnemonic={search.actions.generateAiMnemonic}
          setQuery={search.actions.setQuery}
          onSearch={search.actions.handleSearch}
        />
      )}
    </div>
  );
};

export default SearchTab;
