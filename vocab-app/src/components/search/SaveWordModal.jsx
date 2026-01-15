import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import SearchResultEntries from './SearchResultEntries';

const SaveWordModal = ({
  isOpen,
  onClose,
  searchResult,
  normalizedEntries,
  folders,
  onSaveWord
}) => {
  const [step, setStep] = useState(1);
  const [selectedEntryIndices, setSelectedEntryIndices] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedEntryIndices(null);
    setSelectedFolderId(null);
    setIsSaving(false);
  }, [isOpen, searchResult?.word]);

  const selectedEntries = useMemo(() => {
    if (!Array.isArray(normalizedEntries) || normalizedEntries.length === 0) return [];
    if (selectedEntryIndices === null) return normalizedEntries;
    return normalizedEntries.filter((_, index) => selectedEntryIndices.has(index));
  }, [normalizedEntries, selectedEntryIndices]);

  const totalEntries = normalizedEntries.length;
  const selectedCount = selectedEntryIndices === null
    ? totalEntries
    : selectedEntryIndices.size;
  const allSelected = totalEntries > 0 && selectedCount === totalEntries;

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

  const handleToggleAll = useCallback(() => {
    setSelectedEntryIndices((prev) => {
      if (normalizedEntries.length === 0) return prev;
      return prev === null ? new Set() : null;
    });
  }, [normalizedEntries.length]);

  const handleNext = useCallback(() => {
    setStep(2);
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (!selectedFolderId || !searchResult) return;
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
    setIsSaving(true);
    const saved = await onSaveWord(selectedFolderId, selectedDefinitions);
    setIsSaving(false);
    if (saved) onClose?.();
  }, [onClose, onSaveWord, searchResult, selectedEntries, selectedFolderId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase">儲存單字</p>
            <h3 className="text-lg font-bold text-gray-800">
              {step === 1 ? '選擇解釋' : '選擇資料夾'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="關閉"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <SearchResultEntries
              normalizedEntries={normalizedEntries}
              searchWord={searchResult.word}
              selectedEntryIndices={selectedEntryIndices}
              onToggleEntry={handleToggleEntry}
              onToggleAll={handleToggleAll}
              allSelected={allSelected}
              readOnly={false}
            />
          )}

          {step === 2 && (
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">選擇資料夾</h4>
              <div className="space-y-2">
                {[...folders].reverse().map((folder) => {
                  const isSelected = selectedFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-800">{folder.name}</span>
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {step === 1 ? `已選 ${selectedCount || 0} / ${totalEntries}` : ''}
          </div>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                上一步
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                下一步 (選擇資料夾)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={!selectedFolderId || isSaving}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                {isSaving ? '儲存中...' : '確認儲存'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveWordModal;
