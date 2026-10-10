import React from 'react';
import nlp from 'compromise';

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

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightWithCollocation = (text, word, collocation) => {
  if (!text) return text;
  if (!collocation || !collocation.trim()) return highlightWord(text, word);

  const escaped = escapeRegex(collocation.trim());
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <span
          key={`colloc-${index}`}
          className="border-b-2 border-amber-400 bg-amber-100/60 text-amber-900 px-1 py-0.5 rounded font-medium inline-block my-0.5"
          title={`常用搭配: ${collocation}`}
        >
          {highlightWord(part, word)}
        </span>
      );
    }
    return <React.Fragment key={`colloc-plain-${index}`}>{highlightWord(part, word)}</React.Fragment>;
  });
};

const getClozeValidAnswers = (sentence, targetWord) => {
  if (!targetWord) return { validAnswers: [], contextMatches: [] };
  const normalizedTarget = targetWord.trim();
  if (!normalizedTarget) return { validAnswers: [], contextMatches: [] };

  const targetLower = normalizedTarget.toLowerCase();
  const validAnswers = new Set([targetLower]);
  const contextMatches = new Set();

  if (!sentence) return { validAnswers: [...validAnswers], contextMatches: [] };

  const doc = nlp(sentence);
  const directMatches = doc.match(normalizedTarget);

  if (directMatches.found) {
    directMatches.terms().out('array').forEach((term) => {
      if (term) contextMatches.add(term);
    });
  }

  doc
    .verbs()
    .json()
    .filter((verbMatch) => verbMatch.verb && verbMatch.verb.infinitive)
    .filter((verbMatch) => verbMatch.verb.infinitive.toLowerCase() === targetLower)
    .map((verbMatch) => verbMatch.verb.root)
    .forEach((verbRoot) => {
      if (verbRoot) contextMatches.add(verbRoot);
    });

  doc
    .nouns()
    .json()
    .forEach((nounMatch) => {
      if (!nounMatch || !nounMatch.text) return;
      const singularPhrase = nlp(nounMatch.text).nouns().toSingular().out('array')[0] || '';
      const singularWords = singularPhrase.split(/\s+/).filter(Boolean);
      const singularHead = singularWords[singularWords.length - 1] || '';
      if (singularHead.toLowerCase() !== targetLower) return;

      const nounTerms = nounMatch.terms || [];
      let nounHead = '';
      for (let i = nounTerms.length - 1; i >= 0; i -= 1) {
        const termTags = nounTerms[i].tags || [];
        if (termTags.includes('Noun')) {
          nounHead = nounTerms[i].text;
          break;
        }
      }
      if (!nounHead && nounTerms.length > 0) {
        nounHead = nounTerms[nounTerms.length - 1].text;
      }
      if (nounHead) contextMatches.add(nounHead);
    });

  const contextList = [...contextMatches];
  contextList.forEach((contextWord) => validAnswers.add(contextWord.toLowerCase()));

  return { validAnswers: [...validAnswers], contextMatches: contextList };
};

const maskMatches = (sentence, matchTexts) => {
  const mask = '________';
  const uniqueMatches = [...new Set(matchTexts.filter(Boolean))];
  return uniqueMatches.reduce((output, matchText) => {
    const escaped = escapeRegex(matchText);
    if (!escaped) return output;
    return output.replace(new RegExp(escaped, 'g'), mask);
  }, sentence);
};

const formatClozeSentence = (sentence, targetWord) => {
  if (!sentence || !targetWord) return sentence;
  const normalizedTarget = targetWord.trim();
  if (!normalizedTarget) return sentence;

  const doc = nlp(sentence);
  const matches = doc.match(normalizedTarget);

  if (matches.found) {
    return maskMatches(sentence, matches.out('array'));
  }

  const targetLower = normalizedTarget.toLowerCase();
  const verbRoots = doc
    .verbs()
    .json()
    .filter((verbMatch) => verbMatch.verb && verbMatch.verb.infinitive)
    .filter((verbMatch) => verbMatch.verb.infinitive.toLowerCase() === targetLower)
    .map((verbMatch) => verbMatch.verb.root);

  if (verbRoots.length > 0) {
    return maskMatches(sentence, verbRoots);
  }

  const escapedTarget = escapeRegex(normalizedTarget);
  return sentence.replace(new RegExp(escapedTarget, 'gi'), '________');
};

const renderClozeWithCollocation = (sentence, targetWord, collocation) => {
  if (!sentence) return '';
  const clozeFormatted = formatClozeSentence(sentence, targetWord);
  if (!collocation || !collocation.trim()) {
    return clozeFormatted;
  }

  const clozeOfCollocation = formatClozeSentence(collocation.trim(), targetWord);
  const escaped = escapeRegex(clozeOfCollocation);
  const regex = new RegExp(`(${escaped})`, 'gi');

  if (!regex.test(clozeFormatted)) {
    return clozeFormatted;
  }

  const parts = clozeFormatted.split(regex);
  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <span
          key={`cloze-colloc-${index}`}
          className="border-b-2 border-amber-400 bg-amber-100/70 text-amber-950 px-1.5 py-0.5 rounded-md font-semibold inline-block mx-0.5 shadow-2xs"
          title={`搭配詞組合: ${collocation}`}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={`cloze-part-${index}`}>{part}</React.Fragment>;
  });
};

export {
  highlightWord,
  highlightWithCollocation,
  formatClozeSentence,
  renderClozeWithCollocation,
  getClozeValidAnswers
};
