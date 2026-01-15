import React from 'react';
import { Check } from 'lucide-react';
import { splitExampleLines } from '../../utils/data';
import { highlightWord } from '../../utils/text.jsx';

const SearchResultEntries = ({
  normalizedEntries,
  searchWord,
  selectedEntryIndices,
  onToggleEntry,
  onToggleAll,
  allSelected,
  readOnly = false
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-bold text-gray-400 uppercase">解釋 & 例句</h3>
      {normalizedEntries.length > 0 && !readOnly && (
        <button
          type="button"
          onClick={onToggleAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
        >
          {allSelected ? '清除' : '全選'}
        </button>
      )}
    </div>
    <div className="space-y-4">
      {normalizedEntries.map((entry, index) => {
        const isSelected = readOnly
          ? true
          : (selectedEntryIndices === null
            ? true
            : selectedEntryIndices.has(index));
        const baseClassName = 'rounded-xl border p-4 transition';
        const interactiveClassName = readOnly
          ? 'border-gray-100 bg-white'
          : (isSelected
            ? 'border-blue-500 bg-blue-50/50 cursor-pointer'
            : 'border-gray-200 bg-white opacity-60 cursor-pointer');
        return (
          <div
            key={`${entry.definition}-${index}`}
            role={readOnly ? undefined : 'button'}
            tabIndex={readOnly ? undefined : 0}
            onClick={readOnly ? undefined : () => onToggleEntry?.(index)}
            onKeyDown={readOnly ? undefined : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggleEntry?.(index);
              }
            }}
            className={`relative ${baseClassName} ${interactiveClassName}`}
          >
            {!readOnly && (
              <div className="absolute top-3 right-3">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
            <div className={readOnly ? '' : 'pr-10'}>
              {entry.translation && <p className="text-lg text-gray-800 font-medium">{entry.translation}</p>}
              {entry.definition && <p className="text-gray-600 mt-1">{entry.definition}</p>}
            </div>
            {entry.examples && entry.examples.length > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
                {entry.examples.map((example, exampleIndex) => {
                  const lines = splitExampleLines(example);
                  return (
                    <p key={`${index}-ex-${exampleIndex}`} className="text-gray-700">
                      {lines.map((line, lineIndex) => (
                        <React.Fragment key={`${index}-ex-${exampleIndex}-line-${lineIndex}`}>
                          {highlightWord(line, searchWord)}
                          {lineIndex < lines.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {normalizedEntries.length === 0 && (
        <p className="text-gray-500">查無解釋</p>
      )}
    </div>
  </div>
);

export default SearchResultEntries;
