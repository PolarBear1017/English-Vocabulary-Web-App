import React from 'react';

const highlightWord = (text, word) => {
  if (!text || !word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part)
      ? <span key={`hl-${index}`} className="text-blue-600 font-semibold">{part}</span>
      : <React.Fragment key={`hl-${index}`}>{part}</React.Fragment>
  );
};

export { highlightWord };
