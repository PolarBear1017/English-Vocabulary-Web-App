import { createSearchResult } from '../models';
import { normalizeEntries } from '../../utils/data';

const toSearchResultFromDictionary = (data) => {
  const entries = normalizeEntries(data);
  return createSearchResult({
    ...data,
    entries,
    audioUrl: data.audioUrl || null,
    usAudioUrl: data.usAudioUrl || data.audioUrl || null,
    ukAudioUrl: data.ukAudioUrl || null,
    similar: [],
    mnemonics: null,
    isAiGenerated: false,
    source: 'Cambridge'
  });
};

const toSearchResultFromAi = (data, source) => {
  const entries = normalizeEntries(data);
  return createSearchResult({
    ...data,
    entries,
    audioUrl: null,
    usAudioUrl: null,
    ukAudioUrl: null,
    mnemonics: null,
    isAiGenerated: true,
    source
  });
};

const toSearchResultFromLibrary = (word) => {
  const entries = Array.isArray(word.selectedDefinitions) && word.selectedDefinitions.length > 0
    ? normalizeEntries({ entries: word.selectedDefinitions })
    : normalizeEntries(word);
  return createSearchResult({
    ...word,
    entries,
    similar: word.similar || [],
    usAudioUrl: word.usAudioUrl || null,
    ukAudioUrl: word.ukAudioUrl || null,
    source: 'Library',
    isAiGenerated: false
  });
};

const toSearchResultFallback = (word) => {
  const fallback = {
    word,
    pos: 'unknown',
    phonetic: '/?/',
    definition: '查無此字 (請檢查拼字，或在設定頁面輸入 API Key 以啟用 AI 救援)',
    translation: '未知',
    example: 'Please enter your Gemini or Groq API Key to unlock infinite dictionary.',
    similar: [],
    audioUrl: null,
    usAudioUrl: null,
    ukAudioUrl: null,
    mnemonics: null,
    isAiGenerated: false
  };

  return createSearchResult({
    ...fallback,
    entries: normalizeEntries(fallback)
  });
};

export {
  toSearchResultFromDictionary,
  toSearchResultFromAi,
  toSearchResultFromLibrary,
  toSearchResultFallback
};
