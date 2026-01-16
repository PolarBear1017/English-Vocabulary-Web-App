import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SearchResultHeader from './SearchResultHeader';
import SearchResultEntries from './SearchResultEntries';
import SearchSimilarList from './SearchSimilarList';
import SearchMnemonic from './SearchMnemonic';
import FolderSelectionList from './FolderSelectionList';

const SearchResultCard = ({
  searchResult,
  normalizedEntries,
  preferredAccent,
  setPreferredAccent,
  preferredSearchAudio,
  onSpeak,
  savedWordInSearch,
  saveButtonFeedback,
  folders,
  lastUsedFolderIds,
  onSaveWord,
  onRemoveWordFromFolder,
  onUpdateLastUsedFolderIds,
  onCreateFolder,
  apiKey,
  aiLoading,
  onGenerateMnemonic,
  setQuery,
  onSearch
}) => {
  const [saveStep, setSaveStep] = useState('idle');
  const [selectedEntryIndices, setSelectedEntryIndices] = useState(null);

  useEffect(() => {
    setSaveStep('idle');
    setSelectedEntryIndices(null);
  }, [searchResult?.word]);

  const selectedDefinitionSet = useMemo(() => {
    const raw = savedWordInSearch?.selectedDefinitions || savedWordInSearch?.selected_definitions;
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw
      .map((item) => (item?.definition || '').trim())
      .filter(Boolean));
  }, [savedWordInSearch]);

  const orderedEntries = useMemo(() => {
    if (!Array.isArray(normalizedEntries) || normalizedEntries.length === 0) return [];
    if (selectedDefinitionSet.size === 0) return normalizedEntries;
    const pinned = [];
    const rest = [];
    normalizedEntries.forEach((entry) => {
      const key = (entry.definition || '').trim();
      if (selectedDefinitionSet.has(key)) {
        pinned.push(entry);
      } else {
        rest.push(entry);
      }
    });
    return [...pinned, ...rest];
  }, [normalizedEntries, selectedDefinitionSet]);

  const selectedEntries = useMemo(() => {
    if (orderedEntries.length === 0) return [];
    if (selectedEntryIndices === null) return orderedEntries;
    return orderedEntries.filter((_, index) => selectedEntryIndices.has(index));
  }, [orderedEntries, selectedEntryIndices]);

  const handleToggleEntry = useCallback((index) => {
    setSelectedEntryIndices((prev) => {
      const total = orderedEntries.length;
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
  }, [orderedEntries.length]);

  const handleToggleAll = useCallback(() => {
    setSelectedEntryIndices((prev) => {
      if (orderedEntries.length === 0) return prev;
      return prev === null ? new Set() : null;
    });
  }, [orderedEntries.length]);

  const resetSaveFlow = useCallback(() => {
    setSaveStep('idle');
    setSelectedEntryIndices(null);
  }, []);

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

  const handleConfirmFolders = useCallback(async ({ addIds, removeIds, selectedIds }) => {
    const tasks = [];

    if (Array.isArray(removeIds) && removeIds.length > 0) {
      tasks.push(...removeIds.map((folderId) => onRemoveWordFromFolder?.(savedWordInSearch, folderId)));
    }

    if (Array.isArray(addIds) && addIds.length > 0) {
      tasks.push(...addIds.map((folderId) => handleSaveWord(folderId)));
    }

    if (tasks.length > 0) {
      await Promise.all(tasks.map((task) => Promise.resolve(task)));
    }

    if (Array.isArray(selectedIds)) {
      onUpdateLastUsedFolderIds?.(selectedIds);
    }

    resetSaveFlow();
  }, [handleSaveWord, onRemoveWordFromFolder, onUpdateLastUsedFolderIds, resetSaveFlow, savedWordInSearch]);

  const applySavedSelection = useCallback(() => {
    if (selectedDefinitionSet.size === 0) {
      setSelectedEntryIndices(null);
      return;
    }
    const indices = [];
    orderedEntries.forEach((entry, index) => {
      const key = (entry.definition || '').trim();
      if (selectedDefinitionSet.has(key)) indices.push(index);
    });
    if (indices.length === 0) {
      setSelectedEntryIndices(new Set());
      return;
    }
    if (indices.length === orderedEntries.length) {
      setSelectedEntryIndices(null);
      return;
    }
    setSelectedEntryIndices(new Set(indices));
  }, [orderedEntries, selectedDefinitionSet]);

  const handleStartSave = useCallback(() => {
    if (saveStep !== 'idle') return;
    applySavedSelection();
    setSaveStep('selecting');
  }, [applySavedSelection, saveStep]);

  const handleCancelSave = useCallback(() => {
    resetSaveFlow();
  }, [resetSaveFlow]);

  const handleNextSave = useCallback(() => {
    setSaveStep('folder');
  }, []);

  const handleBackSave = useCallback(() => {
    setSaveStep('selecting');
  }, []);

  const headerStep = saveStep === 'folder' ? 'selecting' : saveStep;
  const isSelectingView = saveStep === 'selecting' || saveStep === 'folder';

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
        saveStep={headerStep}
        onStartSave={handleStartSave}
        onCancelSave={handleCancelSave}
        onNextSave={handleNextSave}
        onBackSave={handleBackSave}
        onSearchFullDefinition={() => onSearch(searchResult.word)}
      />

      <div className="p-6 space-y-6">
        <SearchResultEntries
          normalizedEntries={orderedEntries}
          searchWord={searchResult.word}
          selectedEntryIndices={selectedEntryIndices}
          onToggleEntry={handleToggleEntry}
          onToggleAll={handleToggleAll}
          allSelected={selectedEntryIndices === null}
          readOnly={!isSelectingView}
        />

        {saveStep === 'idle' && (
          <>
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
          </>
        )}

        {saveStep === 'folder' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={handleCancelSave} />
            <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase">選擇資料夾</h4>
              </div>
              <FolderSelectionList
                folders={folders}
                savedFolderIds={savedWordInSearch?.folderIds || []}
                lastUsedFolderIds={lastUsedFolderIds}
                searchWord={searchResult.word}
                onConfirm={handleConfirmFolders}
                onCancel={handleCancelSave}
                onCreateFolder={onCreateFolder}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultCard;
