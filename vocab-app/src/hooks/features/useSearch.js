import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AI_ERROR_CODES, fetchDefinition, fetchMnemonic } from '../../services/aiService';
import { fetchDictionaryEntry, fetchSuggestions } from '../../services/dictionaryService';
import { fetchDictionaryAiData, upsertDictionaryAiData } from '../../services/libraryService';
import { MOCK_DICTIONARY_DB } from '../../utils/mockData';
import {
  toSearchResultFromAi,
  toSearchResultFromDictionary,
  toSearchResultFallback
} from '../../domain/mappers/searchResultMapper';
import { normalizeEntries } from '../../utils/data';

const SEARCH_HISTORY_KEY = 'vocab_search_history';
const HISTORY_LIMIT = 50;
const SUGGESTION_LIMIT = 5;

const loadSearchHistory = () => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.word === 'string');
  } catch (error) {
    console.warn('Failed to load search history', error);
    return [];
  }
};

const saveSearchHistory = (history) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save search history', error);
  }
};

const removeSearchHistory = () => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.warn('Failed to remove search history', error);
  }
};

const useSearch = ({ apiKeys, onSearchStart, onRequireApiKeys, session }) => {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState(() => loadSearchHistory());
  const [saveButtonFeedback, setSaveButtonFeedback] = useState(false);

  const ignoreNextQueryUpdate = useRef(false);
  const searchInputRef = useRef(null);

  const loadCachedAiData = useCallback(async (word) => {
    if (!word) return null;
    if (!session) return null;
    try {
      const { data, error } = await fetchDictionaryAiData(word);
      if (error) {
        if (error.message?.includes('column "ai_data" of relation "dictionary" does not exist')) {
          return null;
        }
        console.warn('AI cache fetch failed', error);
        return null;
      }
      return data?.ai_data || null;
    } catch (error) {
      console.warn('AI cache fetch failed', error);
      return null;
    }
  }, [session]);

  const saveAiData = useCallback(async (word, patch) => {
    if (!word) return;
    if (!session) return;
    try {
      const { data, error } = await fetchDictionaryAiData(word);
      if (error) {
        if (error.message?.includes('column "ai_data" of relation "dictionary" does not exist')) {
          return;
        }
        console.warn('AI cache prefetch failed', error);
      }
      const existing = data?.ai_data && typeof data.ai_data === 'object' ? data.ai_data : {};
      const next = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      const { error: upsertError } = await upsertDictionaryAiData({ word, aiData: next });
      if (upsertError) {
        if (!upsertError.message?.includes('column "ai_data" of relation "dictionary" does not exist')) {
          console.warn('AI cache save failed', upsertError);
        }
      }
    } catch (error) {
      console.warn('AI cache save failed', error);
    }
  }, [session]);

  useEffect(() => {
    setSaveButtonFeedback(false);
  }, [searchResult?.word]);

  useEffect(() => {
    if (ignoreNextQueryUpdate.current) {
      ignoreNextQueryUpdate.current = false;
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const historyMatches = searchHistory
      .filter((item) => item.word.toLowerCase().startsWith(normalizedQuery))
      .map((item) => ({ word: item.word, isHistory: true }))
      .slice(0, SUGGESTION_LIMIT);

    setSuggestions(historyMatches);

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const data = await fetchSuggestions(normalizedQuery, { signal: controller.signal });
        if (!controller.signal.aborted) {
          const remoteSuggestions = (data || [])
            .map((item) => ({
              word: typeof item === 'string' ? item : item.word,
              isHistory: false,
              matchType: typeof item === 'string' ? null : item.match_type,
              score: typeof item === 'string' ? null : item.score
            }))
            .filter((item) => item.word);

          const seen = new Set();
          const merged = [...historyMatches, ...remoteSuggestions].filter((item) => {
            const key = item.word.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          setSuggestions(merged.slice(0, SUGGESTION_LIMIT));
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Suggestion fetch failed', error);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, searchHistory]);

  const updateSearchHistory = useCallback((word) => {
    const normalized = word.trim();
    if (!normalized) return;
    setSearchHistory((prev) => {
      const next = [
        { word: normalized, lastUsed: Date.now() },
        ...prev.filter((item) => item.word.toLowerCase() !== normalized.toLowerCase())
      ].slice(0, HISTORY_LIMIT);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    removeSearchHistory();
  }, []);

  const setQuerySilently = useCallback((value) => {
    ignoreNextQueryUpdate.current = true;
    setQuery(value);
  }, []);

  const handleSearch = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const searchTerm = (typeof e === 'string' ? e : query).trim();
    if (!searchTerm) return;

    updateSearchHistory(searchTerm);
    setSuggestions([]);
    if (onSearchStart) onSearchStart();

    if (typeof e === 'string') {
      setQuerySilently(searchTerm);
    }

    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);
    setAiError(null);

    const lowerQuery = searchTerm.toLowerCase();

    try {
      if (MOCK_DICTIONARY_DB[lowerQuery]) {
        setTimeout(() => {
          const mock = MOCK_DICTIONARY_DB[lowerQuery];
          setSearchResult({ ...mock, entries: normalizeEntries(mock), isAiGenerated: false });
          setIsSearching(false);
        }, 500);
        return;
      }

      let dictionaryData = null;
      try {
        const data = await fetchDictionaryEntry(lowerQuery);
        if (data) {
          const normalized = normalizeEntries(data);
          if (normalized.length > 0) {
            dictionaryData = data;
          }
        }
      } catch (error) {
        console.warn("劍橋字典 API 呼叫失敗，將切換至 AI 模式", error);
      }

      if (dictionaryData) {
        setSearchResult(toSearchResultFromDictionary(dictionaryData));
      } else {
        const cachedAi = await loadCachedAiData(lowerQuery);
        if (cachedAi?.definition) {
          const cachedSource = cachedAi.definitionSource || 'AI';
          setSearchResult(toSearchResultFromAi(cachedAi.definition, cachedSource));
        } else {
          if (!apiKeys?.geminiKey && !apiKeys?.groqKey) {
            const error = new Error("請至少在設定頁面輸入一種 AI API Key (Gemini 或 Groq)。");
            error.code = AI_ERROR_CODES.MISSING_API_KEYS;
            throw error;
          }
          setIsAiLoading(true);
          const { data, source } = await fetchDefinition({
            geminiKey: apiKeys.geminiKey,
            groqKey: apiKeys.groqKey,
            word: lowerQuery
          });
          setSearchResult(toSearchResultFromAi(data, source));
          saveAiData(lowerQuery, { definition: data, definitionSource: source });
        }
      }
    } catch (error) {
      console.error(error);
      setSearchError(`AI 查詢失敗: ${error.message}`);
      setAiError({ code: error.code || 'AI_ERROR', message: error.message });
      if (error.code === AI_ERROR_CODES.MISSING_API_KEYS) {
        onRequireApiKeys?.();
      }
    } finally {
      setIsSearching(false);
      setIsAiLoading(false);
    }
  }, [apiKeys, loadCachedAiData, onRequireApiKeys, onSearchStart, query, saveAiData, setQuerySilently]);

  const generateAiMnemonic = useCallback(async () => {
    if (!searchResult) return;
    if (!apiKeys?.geminiKey && !apiKeys?.groqKey) {
      const error = new Error("請先在設定頁面輸入至少一組 API Key");
      error.code = AI_ERROR_CODES.MISSING_API_KEYS;
      setAiError({ code: error.code, message: error.message });
      onRequireApiKeys?.();
      alert(error.message);
      return;
    }
    const cachedAi = await loadCachedAiData(searchResult.word);
    if (cachedAi?.mnemonic) {
      setSearchResult(prev => ({
        ...prev,
        mnemonics: cachedAi.mnemonic,
        isAiGenerated: true
      }));
      return;
    }
    setAiLoading(true);
    try {
      const mnemonics = await fetchMnemonic({
        geminiKey: apiKeys.geminiKey,
        groqKey: apiKeys.groqKey,
        word: searchResult.word,
        definition: searchResult.definition
      });

      setSearchResult(prev => ({
        ...prev,
        mnemonics,
        isAiGenerated: true
      }));
      saveAiData(searchResult.word, { mnemonic: mnemonics });
    } catch (error) {
      alert("生成失敗: " + error.message);
    } finally {
      setAiLoading(false);
    }
  }, [apiKeys, loadCachedAiData, onRequireApiKeys, saveAiData, searchResult]);

  const triggerSaveButtonFeedback = useCallback(() => {
    setSaveButtonFeedback(true);
    setTimeout(() => setSaveButtonFeedback(false), 1000);
  }, []);

  const normalizedEntries = useMemo(() => (searchResult ? normalizeEntries(searchResult) : []), [searchResult]);

  return {
    state: {
      query,
      searchResult,
      isSearching,
      aiLoading,
      isAiLoading,
      aiError,
      searchError,
      suggestions,
      saveButtonFeedback
    },
    derived: {
      normalizedEntries
    },
    actions: {
      setQuery,
      setQuerySilently,
      setSearchResult,
      setSuggestions,
      handleSearch,
      generateAiMnemonic,
      triggerSaveButtonFeedback,
      clearSearchHistory
    },
    refs: {
      searchInputRef
    }
  };
};

export default useSearch;
