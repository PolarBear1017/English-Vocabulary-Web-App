import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
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
  const [draftFolderIds, setDraftFolderIds] = useState(null);
  const [isConfirmingFolders, setIsConfirmingFolders] = useState(false);
  const isProcessingRef = useRef(false);

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

  const hasDefinitionChanges = useMemo(() => {
    if (!savedWordInSearch) return false;
    const currentDefs = selectedEntries
      .map((entry) => (entry.definition || '').trim())
      .filter(Boolean);
    const originalDefsRaw = savedWordInSearch.selectedDefinitions || [];
    const originalDefs = originalDefsRaw
      .map((item) => (typeof item === 'string' ? item : item?.definition)?.trim())
      .filter(Boolean);
    if (currentDefs.length !== originalDefs.length) return true;
    const originalSet = new Set(originalDefs);
    for (const def of currentDefs) {
      if (!originalSet.has(def)) return true;
    }
    return false;
  }, [savedWordInSearch, selectedEntries]);

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
    setDraftFolderIds(null);
  }, []);

  const handleSaveWord = useCallback((folderId, overrideWord = null) => {
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
    return onSaveWord(folderId, selectedDefinitions, { showToast: false }, overrideWord);
  }, [onSaveWord, searchResult.pos, selectedEntries]);

  const handleConfirmFolders = useCallback(async ({ addIds, removeIds, selectedIds }) => {
    if (isProcessingRef.current || isConfirmingFolders) return;
    isProcessingRef.current = true;
    setIsConfirmingFolders(true);
    const removeList = Array.isArray(removeIds) ? removeIds : [];
    const addList = Array.isArray(addIds) ? addIds : [];
    let isDefinitionsUpdated = false;
    let hasAddSuccess = false;
    const hasRemove = removeList.length > 0;
    const normalizeFolderIds = (ids) => (Array.isArray(ids) ? ids.map(id => id?.toString()).filter(Boolean) : []);
    let currentWordState = savedWordInSearch
      ? { ...savedWordInSearch, folderIds: normalizeFolderIds(savedWordInSearch.folderIds) }
      : { ...searchResult, folderIds: [] };

    try {
      if (addList.length > 0) {
        for (const folderId of addList) {
          const saved = await handleSaveWord(folderId, currentWordState);
          if (saved) {
            isDefinitionsUpdated = true;
            hasAddSuccess = true;
            currentWordState = {
              ...currentWordState,
              folderIds: Array.from(new Set([...(currentWordState.folderIds || []), folderId?.toString()].filter(Boolean)))
            };
          }
        }
      }

      if (removeList.length > 0) {
        for (const folderId of removeList) {
          await onRemoveWordFromFolder?.(currentWordState, folderId);
          currentWordState = {
            ...currentWordState,
            folderIds: (currentWordState.folderIds || []).filter(id => id !== folderId?.toString())
          };
        }
      }

      if (hasDefinitionChanges && !isDefinitionsUpdated) {
        const targetFolderId = Array.isArray(selectedIds) ? selectedIds[0] : null;
        const updated = await handleSaveWord(targetFolderId || null, currentWordState);
        if (updated) {
          isDefinitionsUpdated = true;
        }
      }

      if (hasAddSuccess && hasRemove) {
        toast.success('資料夾更新成功');
      } else if (hasAddSuccess) {
        toast.success('已加入資料夾');
      } else if (hasRemove) {
        toast.success('已從資料夾移除');
      }

      if (isDefinitionsUpdated && hasDefinitionChanges) {
        toast.success('已更新解釋');
      }

      if (Array.isArray(selectedIds)) {
        onUpdateLastUsedFolderIds?.(selectedIds);
      }
    } finally {
      setIsConfirmingFolders(false);
      isProcessingRef.current = false;
      resetSaveFlow();
    }
  }, [handleSaveWord, hasDefinitionChanges, isConfirmingFolders, onRemoveWordFromFolder, onUpdateLastUsedFolderIds, resetSaveFlow, savedWordInSearch]);

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
    setDraftFolderIds(null);
    setSaveStep('folder');
  }, [applySavedSelection, saveStep]);

  const handleCancelSave = useCallback(() => {
    resetSaveFlow();
  }, [resetSaveFlow]);

  const handleNextSave = useCallback(() => {
    setSaveStep('folder');
  }, []);

  const handleEditDefinitions = useCallback(() => {
    setSaveStep('selecting');
  }, []);

  const headerStep = saveStep;
  const isSelectingView = saveStep === 'selecting';

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
        onBackSave={handleEditDefinitions}
        onSearchFullDefinition={() => onSearch(searchResult.word)}
      />

      <div className={`p-6 space-y-6${isSelectingView ? ' max-h-[70vh] overflow-y-auto' : ''}`}>
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
                savedFolderIds={savedWordInSearch?.folderIds}
                lastUsedFolderIds={lastUsedFolderIds}
                initialSelectedIds={draftFolderIds}
                searchWord={searchResult.word}
                onConfirm={handleConfirmFolders}
                onSelectionChange={setDraftFolderIds}
                onCancel={handleCancelSave}
                onEditDefinitions={handleEditDefinitions}
                hasDefinitionChanges={hasDefinitionChanges}
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
