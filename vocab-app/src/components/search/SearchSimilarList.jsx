import React from 'react';

const SearchSimilarList = ({ similarWords, onSelect }) => (
  <div>
    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">相似字</h3>
    <div className="flex flex-wrap gap-2">
      {similarWords.map((word) => (
        <span
          key={word}
          className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm cursor-pointer hover:bg-gray-200"
          onClick={() => onSelect(word)}
        >
          {word}
        </span>
      ))}
    </div>
  </div>
);

export default SearchSimilarList;
