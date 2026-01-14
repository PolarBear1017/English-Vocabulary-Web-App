import React from 'react';
import { Combobox } from '@headlessui/react';
import { Search, X, Loader2 } from 'lucide-react';

const SearchForm = ({
  query,
  onQueryChange,
  onSearch,
  suggestions,
  setSuggestions,
  isSearching,
  inputRef
}) => {
  const suggestionOptions = suggestions.map((s) => (typeof s === 'string' ? s : s.word));
  const hasSuggestions = suggestionOptions.length > 0;

  return (
    <Combobox
      value={query}
      onChange={(value) => {
        if (!value) return;
        onSearch(value);
        setSuggestions([]);
        inputRef.current?.blur();
      }}
      as="div"
      className="relative"
    >
      {({ activeOption, open }) => {
        const handleKeyDown = (e) => {
          if (e.key !== 'Enter') return;
          if (activeOption) return;
          e.preventDefault();
          onSearch(query);
          setSuggestions([]);
          inputRef.current?.blur();
        };

        return (
          <>
            <Combobox.Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入單字"
              className={`w-full p-4 pl-12 pr-32 shadow-sm border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none ${open && hasSuggestions ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'}`}
            />
            <Search className="absolute left-4 top-4 text-gray-400" />

            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange('');
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-24 top-4 text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              disabled={isSearching}
              onClick={() => {
                onSearch(query);
                setSuggestions([]);
                inputRef.current?.blur();
              }}
              className="absolute right-3 top-2.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : '查詢'}
            </button>

            {open && hasSuggestions && (
              <Combobox.Options className="absolute top-full left-0 right-0 bg-white border border-t-0 border-gray-200 rounded-b-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                {suggestionOptions.map((word, index) => (
                  <Combobox.Option
                    key={`${word}-${index}`}
                    value={word}
                    className={({ active }) => `px-4 py-3 cursor-pointer text-gray-700 flex items-center gap-2 transition ${active ? 'bg-blue-50' : ''}`}
                  >
                    <Search className="w-4 h-4 text-gray-300" />
                    <span>{word}</span>
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            )}
          </>
        );
      }}
    </Combobox>
  );
};

export default SearchForm;
