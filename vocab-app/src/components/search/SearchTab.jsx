import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import SearchForm from './SearchForm';
import SearchResultCard from './SearchResultCard';
import { speak } from '../../utils/speech';

const SearchTab = ({ app }) => {
  const { state, derived, actions, refs } = app;
  const {
    apiKey,
    groqApiKey,
    isDataLoaded,
    query,
    searchResult,
    searchError,
    isSearching,
    aiLoading,
    suggestions,
    returnFolderId,
    isSaveMenuOpen,
    saveButtonFeedback,
    folders,
    preferredAccent
  } = state;
  const {
    normalizedEntries,
    preferredSearchAudio,
    savedWordInSearch
  } = derived;
  const {
    setActiveTab,
    setViewingFolderId,
    setReturnFolderId,
    setQuery,
    setSuggestions,
    handleSearch,
    setPreferredAccent,
    setIsSaveMenuOpen,
    saveWord,
    handleRemoveWordFromFolder,
    generateAiMnemonic
  } = actions;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {returnFolderId && (
        <button
          onClick={() => {
            setViewingFolderId(returnFolderId);
            setActiveTab('library');
            setReturnFolderId(null);
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition font-medium mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 {folders.find(f => f.id === returnFolderId)?.name || '資料夾'}
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
        onQueryChange={setQuery}
        onSearch={handleSearch}
        suggestions={suggestions}
        setSuggestions={setSuggestions}
        isSearching={isSearching}
        inputRef={refs.searchInputRef}
      />

      {searchError && <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{searchError}</div>}

      {searchResult && !isSearching && (
        <SearchResultCard
          searchResult={searchResult}
          normalizedEntries={normalizedEntries}
          preferredAccent={preferredAccent}
          setPreferredAccent={setPreferredAccent}
          preferredSearchAudio={preferredSearchAudio}
          onSpeak={speak}
          savedWordInSearch={savedWordInSearch}
          saveButtonFeedback={saveButtonFeedback}
          isSaveMenuOpen={isSaveMenuOpen}
          setIsSaveMenuOpen={setIsSaveMenuOpen}
          folders={folders}
          onSaveWord={saveWord}
          onRemoveWordFromFolder={handleRemoveWordFromFolder}
          apiKey={apiKey}
          aiLoading={aiLoading}
          onGenerateMnemonic={generateAiMnemonic}
          setQuery={setQuery}
          onSearch={handleSearch}
        />
      )}
    </div>
  );
};

export default SearchTab;
