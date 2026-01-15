import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
}) => {
  const [selectedEntryIndices, setSelectedEntryIndices] = useState(null);

  useEffect(() => {
    setSelectedEntryIndices(null);
  }, [searchResult?.word]);

  const selectedEntries = useMemo(() => {
    if (!Array.isArray(normalizedEntries) || normalizedEntries.length === 0) return [];
    if (selectedEntryIndices === null) return normalizedEntries;
    return normalizedEntries.filter((_, index) => selectedEntryIndices.has(index));
  }, [normalizedEntries, selectedEntryIndices]);

  const handleToggleEntry = useCallback((index) => {
    setSelectedEntryIndices((prev) => {
      const total = normalizedEntries.length;
      if (total === 0) return prev;
      if (prev === null) {
        const next = new Set(Array.from({ length: total }, (_, i) => i));
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next.size === total ? null : next;
      }
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next.size === total ? null : next;
    });
  }, [normalizedEntries.length]);

  const handleSaveWord = useCallback((folderId) => {
    const cleanText = (value) => (value || '')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
    const selectedDefinitions = selectedEntries.map((entry) => {
      const fallbackExample = entry.example ? [entry.example] : [];
      const rawExamples = Array.isArray(entry.examples) ? entry.examples : fallbackExample;
      return {
        definition: entry.definition || '',
        translation: entry.translation || '',
        example: cleanText(entry.example),
        examples: rawExamples.map(cleanText).filter(Boolean),
        pos: entry.pos || searchResult.pos || ''
      };
    });
    return onSaveWord(folderId, selectedDefinitions);
  }, [onSaveWord, searchResult.pos, selectedEntries]);

  return (
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
        onSaveWord={handleSaveWord}
        onRemoveWordFromFolder={onRemoveWordFromFolder}
      />

      <div className="p-6 space-y-6">
        <SearchResultEntries
          normalizedEntries={normalizedEntries}
          searchWord={searchResult.word}
          selectedEntryIndices={selectedEntryIndices}
          onToggleEntry={handleToggleEntry}
        />

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
};

export default SearchResultCard;
