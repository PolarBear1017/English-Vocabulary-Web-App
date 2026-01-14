import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDefinition, fetchMnemonic } from '../../services/aiService';
import { fetchDictionaryEntry, fetchSuggestions } from '../../services/dictionaryService';
import { MOCK_DICTIONARY_DB } from '../../utils/mockData';
import {
  toSearchResultFromAi,
  toSearchResultFromDictionary,
  toSearchResultFallback
} from '../../domain/mappers/searchResultMapper';
import { normalizeEntries } from '../../utils/data';

const useSearch = ({ apiKeys, onSearchStart }) => {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [saveButtonFeedback, setSaveButtonFeedback] = useState(false);

  const ignoreNextQueryUpdate = useRef(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSaveButtonFeedback(false);
  }, [searchResult?.word]);

  useEffect(() => {
    if (ignoreNextQueryUpdate.current) {
      ignoreNextQueryUpdate.current = false;
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        return;
      }
      const data = await fetchSuggestions(query);
      setSuggestions(data);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const setQuerySilently = useCallback((value) => {
    ignoreNextQueryUpdate.current = true;
    setQuery(value);
  }, []);

  const handleSearch = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const searchTerm = (typeof e === 'string' ? e : query).trim();
    if (!searchTerm) return;

    setSuggestions([]);
    if (onSearchStart) onSearchStart();

    if (typeof e === 'string') {
      setQuerySilently(searchTerm);
    }

    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);

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
      } else if (apiKeys?.geminiKey || apiKeys?.groqKey) {
        const { data, source } = await fetchDefinition({
          geminiKey: apiKeys.geminiKey,
          groqKey: apiKeys.groqKey,
          word: lowerQuery
        });
        setSearchResult(toSearchResultFromAi(data, source));
      } else {
        setSearchResult(toSearchResultFallback(lowerQuery));
      }
    } catch (error) {
      console.error(error);
      setSearchError(`AI 查詢失敗: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  }, [apiKeys, onSearchStart, query, setQuerySilently]);

  const generateAiMnemonic = useCallback(async () => {
    if (!searchResult || (!apiKeys?.geminiKey && !apiKeys?.groqKey)) {
      alert("請先在設定頁面輸入至少一組 API Key");
      return;
    }
    setAiLoading(true);
    try {
      const data = await fetchMnemonic({
        geminiKey: apiKeys.geminiKey,
        groqKey: apiKeys.groqKey,
        word: searchResult.word,
        definition: searchResult.definition
      });

      setSearchResult(prev => ({
        ...prev,
        mnemonics: data.mnemonics,
        isAiGenerated: true
      }));
    } catch (error) {
      alert("生成失敗: " + error.message);
    } finally {
      setAiLoading(false);
    }
  }, [apiKeys, searchResult]);

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
      searchError,
      suggestions,
      isSaveMenuOpen,
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
      setIsSaveMenuOpen,
      handleSearch,
      generateAiMnemonic,
      triggerSaveButtonFeedback
    },
    refs: {
      searchInputRef
    }
  };
};

export default useSearch;
