import React from 'react';
import { splitExampleLines } from '../../utils/data';
import { highlightWord } from '../../utils/text.jsx';

const SearchResultEntries = ({ normalizedEntries, searchWord }) => (
  <div>
    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">解釋 & 例句</h3>
    <div className="space-y-4">
      {normalizedEntries.map((entry, index) => (
        <div key={`${entry.definition}-${index}`} className="bg-white/60 rounded-xl border border-gray-100 p-4">
          {entry.translation && <p className="text-lg text-gray-800 font-medium">{entry.translation}</p>}
          {entry.definition && <p className="text-gray-600 mt-1">{entry.definition}</p>}
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
      ))}
      {normalizedEntries.length === 0 && (
        <p className="text-gray-500">查無解釋</p>
      )}
    </div>
  </div>
);

export default SearchResultEntries;
