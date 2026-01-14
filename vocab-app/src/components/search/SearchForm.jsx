import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

const SearchForm = ({
  query,
  onQueryChange,
  onSearch,
  suggestions,
  setSuggestions,
  isSearching,
  inputRef
}) => (
  <form onSubmit={onSearch} className="relative">
    <input
      ref={inputRef}
      type="text"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onBlur={() => setTimeout(() => setSuggestions([]), 200)}
      placeholder="輸入單字 (例如: serendipity)..."
      className={`w-full p-4 pl-12 pr-32 shadow-sm border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none ${suggestions.length > 0 ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'}`}
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

    <button type="submit" disabled={isSearching} className="absolute right-3 top-2.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : '查詢'}
    </button>

    {suggestions.length > 0 && (
      <ul className="absolute top-full left-0 right-0 bg-white border border-t-0 border-gray-200 rounded-b-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
        {suggestions.map((s, index) => (
          <li
            key={index}
            onMouseDown={() => onSearch(s.word)}
            className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 flex items-center gap-2 transition"
          >
            <Search className="w-4 h-4 text-gray-300" />
            <span>{s.word}</span>
          </li>
        ))}
      </ul>
    )}
  </form>
);

export default SearchForm;
