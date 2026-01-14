import React from 'react';
import SearchResultHeader from './SearchResultHeader';
import SearchResultEntries from './SearchResultEntries';
import SearchSimilarList from './SearchSimilarList';
import SearchMnemonic from './SearchMnemonic';

const SearchResultCard = ({
  searchResult,
  normalizedEntries,
  preferredAccent,
  setPreferredAccent,
  preferredSearchAudio,
  onSpeak,
  savedWordInSearch,
  saveButtonFeedback,
  isSaveMenuOpen,
  setIsSaveMenuOpen,
  folders,
  onSaveWord,
  onRemoveWordFromFolder,
  apiKey,
  aiLoading,
  onGenerateMnemonic,
  setQuery,
  onSearch
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <SearchResultHeader
      searchResult={searchResult}
      preferredAccent={preferredAccent}
      onAccentChange={setPreferredAccent}
      preferredSearchAudio={preferredSearchAudio}
      onSpeak={onSpeak}
      savedWordInSearch={savedWordInSearch}
      saveButtonFeedback={saveButtonFeedback}
      isSaveMenuOpen={isSaveMenuOpen}
      setIsSaveMenuOpen={setIsSaveMenuOpen}
      folders={folders}
      onSaveWord={onSaveWord}
      onRemoveWordFromFolder={onRemoveWordFromFolder}
    />

    <div className="p-6 space-y-6">
      <SearchResultEntries normalizedEntries={normalizedEntries} searchWord={searchResult.word} />

      <SearchSimilarList
        similarWords={searchResult.similar}
        onSelect={(word) => {
          setQuery(word);
          onSearch({ preventDefault: () => {} });
        }}
      />

      <SearchMnemonic
        mnemonics={searchResult.mnemonics}
        apiKey={apiKey}
        aiLoading={aiLoading}
        onGenerate={onGenerateMnemonic}
      />
    </div>
  </div>
);

export default SearchResultCard;
