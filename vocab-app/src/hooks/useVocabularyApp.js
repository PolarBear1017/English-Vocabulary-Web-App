import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { FSRS, generatorParameters, createEmptyCard } from 'ts-fsrs';
import {
  callAi,
  generateDefinitionPrompt,
  generateMnemonicPrompt,
  generateStoryPrompt
} from '../utils/ai';
import { MOCK_DICTIONARY_DB } from '../utils/mockData';
import {
  normalizeEntries,
  buildFsrsCard,
  serializeFsrsCard,
  mapGradeToFsrsRating,
  splitExampleLines,
  calculateReviewResult
} from '../utils/data';
import { speak } from '../utils/speech';

const useVocabularyApp = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [settingsView, setSettingsView] = useState('main');
  const [reviewSetupView, setReviewSetupView] = useState('main');

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [session, setSession] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('vocab_folders');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: '預設資料夾', words: [] }];
  });

  const [vocabData, setVocabData] = useState(() => {
    const saved = localStorage.getItem('vocab_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [preferredAccent, setPreferredAccent] = useState('us');
  const [suggestions, setSuggestions] = useState([]);
  const ignoreNextQueryUpdate = useRef(false);
  const searchInputRef = useRef(null);
  const [viewingFolderId, setViewingFolderId] = useState(null);
  const [returnFolderId, setReturnFolderId] = useState(null);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [saveButtonFeedback, setSaveButtonFeedback] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [story, setStory] = useState(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isAwaitingNext, setIsAwaitingNext] = useState(false);
  const [pendingAutoGrade, setPendingAutoGrade] = useState(null);
  const [answerHint, setAnswerHint] = useState('');
  const [hasMistake, setHasMistake] = useState(false);
  const [selectedReviewFolders, setSelectedReviewFolders] = useState(['all']);
  const [folderSortBy, setFolderSortBy] = useState(() => localStorage.getItem('folder_sort_by') || 'created_desc');
  const [wordSortBy, setWordSortBy] = useState(() => localStorage.getItem('word_sort_by') || 'added_desc');
  const [requestRetention, setRequestRetention] = useState(() => {
    const saved = localStorage.getItem('request_retention');
    const parsed = saved ? Number(saved) : 0.9;
    return Number.isFinite(parsed) ? parsed : 0.9;
  });

  const fsrsParams = useMemo(() => generatorParameters({
    enable_fuzzing: true,
    request_retention: requestRetention
  }), [requestRetention]);
  const fsrs = useMemo(() => new FSRS(fsrsParams), [fsrsParams]);

  const normalizedEntries = searchResult ? normalizeEntries(searchResult) : [];
  const currentReviewWord = reviewQueue[currentCardIndex] || {};
  const currentReviewEntries = reviewQueue.length > 0
    ? normalizeEntries(currentReviewWord)
    : [];
  const primaryReviewEntry = currentReviewEntries[0] || {};
  const clozeExample = primaryReviewEntry.example || currentReviewWord.example || '';
  const clozeExampleLines = splitExampleLines(clozeExample);
  const clozeExampleMain = clozeExampleLines[0] || clozeExample;
  const clozeTranslation = (() => {
    if (clozeExampleLines.length > 1) return clozeExampleLines[1];
    return primaryReviewEntry.translation || currentReviewWord.translation || '';
  })();
  const preferredSearchAudio = searchResult
    ? (preferredAccent === 'uk'
      ? (searchResult.ukAudioUrl || searchResult.audioUrl || searchResult.usAudioUrl)
      : (searchResult.usAudioUrl || searchResult.audioUrl || searchResult.ukAudioUrl))
    : null;
  const preferredReviewAudio = currentReviewWord
    ? (preferredAccent === 'uk'
      ? (currentReviewWord.ukAudioUrl || currentReviewWord.audioUrl || currentReviewWord.usAudioUrl)
      : (currentReviewWord.usAudioUrl || currentReviewWord.audioUrl || currentReviewWord.ukAudioUrl))
    : null;

  const activeFolder = viewingFolderId ? folders.find(f => f.id === viewingFolderId) : null;
  const savedWordInSearch = searchResult ? vocabData.find(w => w.word === searchResult.word) : null;
  const allFolderIds = folders.map(folder => folder.id);
  const allFoldersSelected = selectedReviewFolders.includes('all')
    || (allFolderIds.length > 0 && allFolderIds.every(id => selectedReviewFolders.includes(id)));
  const selectedFolderLabel = allFoldersSelected
    ? '全部資料夾'
    : folders
      .filter(folder => selectedReviewFolders.includes(folder.id))
      .map(folder => folder.name)
      .join('、') || '尚未選擇';
  const sortedFolders = useMemo(() => {
    const copy = [...folders];
    switch (folderSortBy) {
      case 'name_asc':
        return copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'));
      case 'count_desc':
        return copy.sort((a, b) => {
          const aCount = vocabData.filter(w => w.folderIds && w.folderIds.includes(a.id)).length;
          const bCount = vocabData.filter(w => w.folderIds && w.folderIds.includes(b.id)).length;
          return bCount - aCount;
        });
      case 'created_desc':
      default:
        return copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
  }, [folders, vocabData, folderSortBy]);
  const sortedActiveFolderWords = useMemo(() => {
    if (!activeFolder) return [];
    const words = vocabData.filter(w => w.folderIds && w.folderIds.includes(activeFolder.id));
    const copy = [...words];
    switch (wordSortBy) {
      case 'alphabetical_asc':
        return copy.sort((a, b) => (a.word || '').localeCompare(b.word || '', 'en'));
      case 'proficiency_asc':
        return copy.sort((a, b) => (a.proficiencyScore || 0) - (b.proficiencyScore || 0));
      case 'next_review_asc':
        return copy.sort((a, b) => new Date(a.nextReview || 0) - new Date(b.nextReview || 0));
      case 'added_desc':
      default:
        return copy.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
    }
  }, [activeFolder, vocabData, wordSortBy]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadData(session.user.id);
      } else {
        supabase.auth.signInAnonymously().catch(console.error);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async (userId) => {
    try {
      const { data: dbFolders, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (folderError) throw folderError;

      const allFolders = [{ id: 'default', name: '預設資料夾', words: [] }];
      if (dbFolders) allFolders.push(...dbFolders.map(f => ({ ...f, id: f.id?.toString(), words: [] })));
      setFolders(allFolders);

      const { data, error } = await supabase
        .from('user_library')
        .select(`
          *,
          folder_ids,
          dictionary:word_id (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        const loadedVocab = data.map(item => {
          const rawFolderIds = Array.isArray(item.folder_ids)
            ? item.folder_ids
            : ['default'];
          const normalizedFolderIds = rawFolderIds.map(id => id?.toString());

          return ({
            ...item.dictionary,
            id: item.word_id.toString(),
            libraryId: item.id,
            folderIds: normalizedFolderIds,
            addedAt: item.created_at || null,
            nextReview: item.next_review || item.due || new Date().toISOString(),
            proficiencyScore: item.proficiency_score,
            due: item.due || item.next_review || new Date().toISOString(),
            stability: item.stability ?? null,
            difficulty: item.difficulty ?? null,
            elapsed_days: item.elapsed_days ?? null,
            scheduled_days: item.scheduled_days ?? null,
            reps: item.reps ?? null,
            lapses: item.lapses ?? null,
            state: item.state ?? null,
            last_review: item.last_review ?? null
          });
        });
        setVocabData(loadedVocab);
      }
      setIsDataLoaded(true);
    } catch (e) {
      console.error("Supabase 載入失敗:", e);
      setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!session?.user) return;
      setIsDataLoaded(false);
      loadData(session.user.id);
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [loadData, session]);

  useEffect(() => {
    localStorage.setItem('vocab_folders', JSON.stringify(folders));
    localStorage.setItem('vocab_data', JSON.stringify(vocabData));
  }, [folders, vocabData]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('groq_api_key', groqApiKey);
  }, [groqApiKey]);

  useEffect(() => {
    localStorage.setItem('request_retention', String(requestRetention));
  }, [requestRetention]);

  useEffect(() => {
    localStorage.setItem('folder_sort_by', folderSortBy);
  }, [folderSortBy]);

  useEffect(() => {
    localStorage.setItem('word_sort_by', wordSortBy);
  }, [wordSortBy]);

  useEffect(() => {
    setSaveButtonFeedback(false);
  }, [searchResult?.word]);

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const triggerSaveButtonFeedback = () => {
    setSaveButtonFeedback(true);
    setTimeout(() => setSaveButtonFeedback(false), 1000);
  };

  const toggleReviewFolder = (folderId) => {
    setSelectedReviewFolders(prev => {
      const base = prev.includes('all') ? allFolderIds : prev;
      if (base.includes(folderId)) {
        const next = base.filter(id => id !== folderId);
        return next.length > 0 ? next : [];
      }
      return [...base, folderId];
    });
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (ignoreNextQueryUpdate.current) {
      ignoreNextQueryUpdate.current = false;
      return;
    }

    const fetchSuggestions = async () => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('dictionary')
          .select('word')
          .ilike('word', `${query}%`)
          .limit(5);

        if (data && data.length > 0) {
          setSuggestions(data);
        } else {
          const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}`);
          if (res.ok) {
            const extData = await res.json();
            setSuggestions(extData.slice(0, 5));
          }
        }
      } catch (e) {
        console.warn("Suggestion fetch failed", e);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 100);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const searchTerm = (typeof e === 'string' ? e : query).trim();
    if (!searchTerm) return;

    setReturnFolderId(null);
    if (typeof e === 'string') {
      ignoreNextQueryUpdate.current = true;
      setQuery(searchTerm);
    }

    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);
    setSuggestions([]);

    const lowerQuery = searchTerm.toLowerCase();

    try {
      if (MOCK_DICTIONARY_DB[lowerQuery]) {
        setTimeout(() => {
          setSearchResult({ ...MOCK_DICTIONARY_DB[lowerQuery], entries: normalizeEntries(MOCK_DICTIONARY_DB[lowerQuery]), isAiGenerated: false });
          setIsSearching(false);
        }, 500);
        return;
      }

      let dictionaryData = null;
      try {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(lowerQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const normalized = normalizeEntries(data);
          if (normalized.length > 0) {
            dictionaryData = { ...data, entries: normalized };
          }
        }
      } catch (e) {
        console.warn("劍橋字典 API 呼叫失敗，將切換至 AI 模式", e);
      }

      if (dictionaryData) {
        setSearchResult({
          ...dictionaryData,
          usAudioUrl: dictionaryData.usAudioUrl || dictionaryData.audioUrl || null,
          ukAudioUrl: dictionaryData.ukAudioUrl || null,
          similar: [],
          mnemonics: null,
          isAiGenerated: false,
          source: 'Cambridge'
        });
      } else if (apiKey || groqApiKey) {
        const { text: jsonStr, source: aiSource } = await callAi(apiKey, groqApiKey, generateDefinitionPrompt(lowerQuery));
        const cleanJson = jsonStr.replace(/```json|```/g, '').trim();
        const aiData = JSON.parse(cleanJson);

        setSearchResult({
          ...aiData,
          entries: normalizeEntries(aiData),
          audio: null,
          usAudioUrl: null,
          ukAudioUrl: null,
          mnemonics: null,
          isAiGenerated: true,
          source: aiSource
        });
      } else {
        const fallbackData = {
          word: lowerQuery,
          pos: "unknown",
          phonetic: "/?/",
          definition: "查無此字 (請檢查拼字，或在設定頁面輸入 API Key 以啟用 AI 救援)",
          translation: "未知",
          example: "Please enter your Gemini or Groq API Key to unlock infinite dictionary.",
          similar: [],
          audio: null,
          usAudioUrl: null,
          ukAudioUrl: null,
          mnemonics: null,
          isAiGenerated: false
        };
        setSearchResult({
          ...fallbackData,
          entries: normalizeEntries(fallbackData)
        });
      }
    } catch (error) {
      console.error(error);
      setSearchError(`AI 查詢失敗: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const generateAiMnemonic = async () => {
    if (!searchResult || (!apiKey && !groqApiKey)) {
      alert("請先在設定頁面輸入至少一組 API Key");
      return;
    }
    setAiLoading(true);
    try {
      const { text: jsonStr } = await callAi(apiKey, groqApiKey, generateMnemonicPrompt(searchResult.word, searchResult.definition));
      const cleanJson = jsonStr.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);

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
  };

  const generateFolderStory = async (folder) => {
    if (!apiKey && !groqApiKey) {
      setActiveTab('settings');
      alert("請先設定 API Key 才能使用故事生成功能！");
      return;
    }

    const wordsInFolder = vocabData
      .filter(w => w.folderIds && w.folderIds.includes(folder.id))
      .map(w => w.word);

    if (wordsInFolder.length < 3) {
      alert("資料夾內至少需要 3 個單字才能生成故事喔！");
      return;
    }

    const targetWords = wordsInFolder.slice(0, 10);

    setIsGeneratingStory(true);
    setStory(null);

    try {
      const { text: storyText } = await callAi(apiKey, groqApiKey, generateStoryPrompt(targetWords));
      setStory(storyText);
    } catch (error) {
      alert("故事生成失敗: " + error.message);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleShowDetails = (word) => {
    const details = {
      ...word,
      entries: normalizeEntries(word),
      similar: word.similar || [],
      usAudioUrl: word.usAudioUrl || null,
      ukAudioUrl: word.ukAudioUrl || null,
      source: 'Library'
    };
    ignoreNextQueryUpdate.current = true;
    setQuery(word.word);
    setSearchResult(details);
    setActiveTab('search');
    if (viewingFolderId) setReturnFolderId(viewingFolderId);
    setViewingFolderId(null);
  };

  const saveWord = async (folderId) => {
    if (!searchResult || !session) {
      if (!session) alert("請先登入才能儲存單字！");
      return;
    }

    const folderName = folders.find(f => f.id === folderId)?.name || '資料夾';

    try {
      let { data: dictWord, error: fetchError } = await supabase
        .from('dictionary')
        .select('id, word')
        .ilike('word', searchResult.word)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!dictWord) {
        const { data: newDictWord, error: dictError } = await supabase
          .from('dictionary')
          .insert([{
            word: searchResult.word,
            definition: searchResult.definition,
            translation: searchResult.translation,
            pos: searchResult.pos,
            phonetic: searchResult.phonetic,
            example: searchResult.example,
            mnemonics: searchResult.mnemonics || null
          }])
          .select()
          .single();

        if (dictError) {
          if (dictError.code === '23505') {
            const { data: retryWord, error: retryError } = await supabase
              .from('dictionary')
              .select('id, word')
              .ilike('word', searchResult.word)
              .maybeSingle();
            if (retryError) throw retryError;
            dictWord = retryWord;
          } else {
            throw dictError;
          }
        } else {
          dictWord = newDictWord;
        }
      }

      if (!dictWord) throw new Error("無法取得單字 ID (請稍後再試)");

      const { data: existingEntry, error: libFetchError } = await supabase
        .from('user_library')
        .select('id, folder_ids')
        .eq('user_id', session.user.id)
        .eq('word_id', dictWord.id)
        .maybeSingle();

      if (libFetchError) throw libFetchError;

      if (existingEntry) {
        const currentFolders = Array.isArray(existingEntry.folder_ids) ? existingEntry.folder_ids : [];
        const normalizedCurrentFolders = currentFolders.map(id => id?.toString());
        const normalizedFolderId = folderId?.toString();

        if (!normalizedFolderId) {
          throw new Error("無效的資料夾 ID，請重新整理後再試。");
        }

        if (normalizedCurrentFolders.includes(normalizedFolderId)) {
          showToast(`「${searchResult.word}」已在「${folderName}」`, 'info');
          return;
        }

        const newFolders = Array.from(new Set([...normalizedCurrentFolders, normalizedFolderId]));

        const { data: updatedEntry, error: updateError } = await supabase
          .from('user_library')
          .update({ folder_ids: newFolders })
          .eq('user_id', session.user.id)
          .eq('word_id', dictWord.id)
          .select('id, folder_ids')
          .maybeSingle();

        if (updateError) throw updateError;

        const mergedFolderIds = Array.isArray(updatedEntry?.folder_ids)
          ? updatedEntry.folder_ids.map(id => id?.toString())
          : newFolders;
        setVocabData(prev => prev.map(w => w.id === dictWord.id.toString() ? { ...w, folderIds: mergedFolderIds } : w));
        showToast(`已加入「${folderName}」`);
        triggerSaveButtonFeedback();
        return;
      }

      const now = new Date();
      const initialCard = createEmptyCard();
      initialCard.due = now;
      const fsrsState = serializeFsrsCard(initialCard);

      const payload = {
        user_id: session.user.id,
        word_id: dictWord.id,
        folder_ids: [folderId?.toString()],
        next_review: fsrsState.due,
        ...fsrsState
      };

      let { data: libraryEntry, error: libError } = await supabase
        .from('user_library')
        .insert([payload])
        .select()
        .single();

      if (libError) {
        if (libError.code === '23505') {
          const { data: fallbackEntry, error: fallbackError } = await supabase
            .from('user_library')
            .select('id, folder_ids')
            .eq('user_id', session.user.id)
            .eq('word_id', dictWord.id)
            .maybeSingle();

          if (fallbackError) throw fallbackError;
          if (!fallbackEntry) throw new Error("無法取得既有單字紀錄，請稍後再試。");

          const currentFolders = Array.isArray(fallbackEntry.folder_ids) ? fallbackEntry.folder_ids : [];
          const normalizedCurrentFolders = currentFolders.map(id => id?.toString());
          const normalizedFolderId = folderId?.toString();

          if (!normalizedFolderId) {
            throw new Error("無效的資料夾 ID，請重新整理後再試。");
          }

          if (normalizedCurrentFolders.includes(normalizedFolderId)) {
            showToast(`「${searchResult.word}」已在「${folderName}」`, 'info');
            return;
          }

          const newFolders = Array.from(new Set([...normalizedCurrentFolders, normalizedFolderId]));
          const { data: updatedEntry, error: updateError } = await supabase
            .from('user_library')
            .update({ folder_ids: newFolders })
            .eq('user_id', session.user.id)
            .eq('word_id', dictWord.id)
            .select('id, folder_ids')
            .maybeSingle();

          if (updateError) throw updateError;

          const mergedFolderIds = Array.isArray(updatedEntry?.folder_ids)
            ? updatedEntry.folder_ids.map(id => id?.toString())
            : newFolders;
          setVocabData(prev => prev.map(w => w.id === dictWord.id.toString() ? { ...w, folderIds: mergedFolderIds } : w));
          showToast(`已加入「${folderName}」`);
          triggerSaveButtonFeedback();
          return;
        }
        throw libError;
      }

      const newWordState = {
        ...searchResult,
        id: dictWord.id.toString(),
        libraryId: libraryEntry.id,
        folderIds: [folderId?.toString()],
        addedAt: libraryEntry.created_at || new Date().toISOString(),
        nextReview: libraryEntry.next_review || fsrsState.due,
        ...fsrsState,
        proficiencyScore: 0
      };

      setVocabData(prev => [...prev, newWordState]);

      showToast(`已儲存到「${folderName}」`);
      triggerSaveButtonFeedback();

    } catch (e) {
      console.error("儲存失敗:", e);
      let msg = e.message || "請稍後再試";
      if (msg.includes("row-level security")) {
        msg = "資料庫權限不足。請在 Supabase SQL Editor 執行 RLS 政策指令以開放寫入權限。";
      } else if (msg.includes('column "folder_ids" of relation "user_library" does not exist')) {
        msg = "資料庫尚未更新。請在 Supabase SQL Editor 執行: ALTER TABLE user_library ADD COLUMN folder_ids text[] DEFAULT '{}';";
      }
      alert("儲存失敗: " + msg);
    }
  };

  const handleManualSync = () => {
    if (session?.user) {
      setIsDataLoaded(false);
      loadData(session.user.id).then(() => alert("同步完成！"));
    } else {
      alert("請先登入才能同步資料！");
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert("登入失敗: " + error.message);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("登出失敗: " + error.message);
    setVocabData([]);
    setFolders([{ id: 'default', name: '預設資料夾', words: [] }]);
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) return alert("請輸入 Email 和密碼");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    setAuthLoading(false);
    if (error) {
      alert('註冊失敗: ' + error.message);
    } else {
      alert('註冊成功！請檢查您的信箱以驗證帳號 (若 Supabase 未關閉驗證信功能)。');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) return alert("請輸入 Email 和密碼");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    setAuthLoading(false);
    if (error) {
      alert('登入失敗: ' + error.message);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const createFolder = async () => {
    const name = prompt("輸入資料夾名稱：");
    if (!name) return;

    if (session?.user) {
      const { data, error } = await supabase
        .from('folders')
        .insert({ name, user_id: session.user.id })
        .select()
        .single();

      if (error) return alert("建立資料夾失敗: " + error.message);
      setFolders(prev => [...prev, { ...data, id: data.id?.toString() }]);
    } else {
      setFolders([...folders, { id: Date.now().toString(), name, words: [] }]);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('確定刪除此資料夾？(資料夾內的單字不會被刪除，只會移除分類)')) return;

    if (session?.user && folderId !== 'default') {
      const { error } = await supabase.from('folders').delete().eq('id', folderId);
      if (error) return alert("刪除失敗: " + error.message);
    }

    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (viewingFolderId === folderId) setViewingFolderId(null);
  };

  const handleRemoveWordFromFolder = async (word, folderId) => {
    const currentFolders = Array.isArray(word.folderIds) ? word.folderIds.map(id => id?.toString()) : [];
    const normalizedFolderId = folderId?.toString();
    if (!normalizedFolderId || currentFolders.length === 0) return;

    if (!currentFolders.includes(normalizedFolderId)) return;

    const nextFolders = currentFolders.filter(id => id !== normalizedFolderId);

    if (nextFolders.length === 0) {
      if (session?.user) {
        const { error } = await supabase
          .from('user_library')
          .update({ folder_ids: [] })
          .eq('id', word.libraryId)
          .eq('user_id', session.user.id);

        if (error) {
          alert("移除失敗: " + error.message);
          return;
        }
      }

      setVocabData(prev => prev.map(w => w.id === word.id ? { ...w, folderIds: [] } : w));
      return;
    }

    if (session?.user) {
      const { error } = await supabase
        .from('user_library')
        .update({ folder_ids: nextFolders })
        .eq('id', word.libraryId)
        .eq('user_id', session.user.id);

      if (error) {
        alert("移除失敗: " + error.message);
        return;
      }
    }

    setVocabData(prev => prev.map(w => w.id === word.id ? { ...w, folderIds: nextFolders } : w));
  };

  const buildReviewBatch = (words, batchSize) => {
    if (words.length <= batchSize) return words;
    const now = new Date();
    const rolloverCutoff = new Date(now);
    rolloverCutoff.setHours(24, 0, 0, 0);
    const dueWords = words
      .filter(w => new Date(w.nextReview) < rolloverCutoff)
      .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));

    if (dueWords.length >= batchSize) {
      return dueWords.slice(0, batchSize);
    }

    const slotsNeeded = batchSize - dueWords.length;
    const dueIds = new Set(dueWords.map(w => w.id));
    const newWords = words.filter(w => (w.proficiencyScore || 0) === 0 && !dueIds.has(w.id));
    const fillNewWords = newWords.slice(0, slotsNeeded);
    const selectedIds = new Set([...dueWords, ...fillNewWords].map(w => w.id));
    const remainingSlots = slotsNeeded - fillNewWords.length;

    let fillNotDue = [];
    if (remainingSlots > 0) {
      fillNotDue = words
        .filter(w => new Date(w.nextReview) >= rolloverCutoff && !selectedIds.has(w.id))
        .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
        .slice(0, remainingSlots);
    }

    const combined = [...dueWords, ...fillNewWords, ...fillNotDue].slice(0, batchSize);
    for (let i = combined.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined;
  };

  const startReview = (folderSelection, mode) => {
    const selectedIds = Array.isArray(folderSelection) ? folderSelection : [folderSelection];
    const isAllSelected = selectedIds.includes('all')
      || (allFolderIds.length > 0 && allFolderIds.every(id => selectedIds.includes(id)));
    const filteredWords = vocabData.filter(w => {
      if (isAllSelected) return true;
      return w.folderIds && w.folderIds.some(id => selectedIds.includes(id));
    });
    if (filteredWords.length === 0) {
      alert("目前沒有可複習的單字！");
      return;
    }

    const reviewBatch = buildReviewBatch(filteredWords, 10);
    setReviewQueue(reviewBatch);
    setCurrentCardIndex(0);
    setReviewMode(mode);
    setIsFlipped(false);
    setUserAnswer('');
    setFeedback(null);
    setIsAwaitingNext(false);
    setPendingAutoGrade(null);
    setAnswerHint('');
    setHasMistake(false);
    setActiveTab('review_session');
  };

  const advanceToNextCard = () => {
    if (pendingAutoGrade !== null) {
      processRating(pendingAutoGrade, { advance: false });
      setPendingAutoGrade(null);
    }

    if (currentCardIndex < reviewQueue.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setUserAnswer('');
      setFeedback(null);
      setIsAwaitingNext(false);
      setAnswerHint('');
      setHasMistake(false);
    } else {
      alert("複習完成！");
      setActiveTab('review');
    }
  };

  useEffect(() => {
    if (!(activeTab === 'review_session' && isFlipped && reviewMode !== 'flashcard' && isAwaitingNext)) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        advanceToNextCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isFlipped, reviewMode, isAwaitingNext, advanceToNextCard]);

  useEffect(() => {
    if (activeTab !== 'review_session') return;

    const handleKeyDown = (event) => {
      if (event.repeat) return;
      const key = event.key;

      if (['1', '2', '3', '4'].includes(key) && isFlipped && reviewMode === 'flashcard') {
        event.preventDefault();
        processRating(Number(key));
        return;
      }

      if ((key === 'Enter' || key === ' ') && !isAwaitingNext) {
        if (!isFlipped) {
          event.preventDefault();
          if (reviewMode === 'flashcard') {
            setIsFlipped(true);
          } else {
            checkAnswer();
          }
          return;
        }

        if (reviewMode === 'flashcard') {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isFlipped, reviewMode, isAwaitingNext]);

  useEffect(() => {
    if (activeTab !== 'review_session' || !isFlipped) return;
    if (!currentReviewWord?.word) return;
    speak(currentReviewWord.word, preferredReviewAudio);
  }, [activeTab, isFlipped, currentReviewWord?.word, preferredReviewAudio]);

  useEffect(() => {
    if (activeTab !== 'review_session' || isFlipped) return;
    if (reviewMode !== 'dictation') return;
    if (!currentReviewWord?.word) return;
    speak(currentReviewWord.word, preferredReviewAudio);
  }, [activeTab, isFlipped, reviewMode, currentReviewWord?.word, preferredReviewAudio]);

  const processRating = (grade, options = {}) => {
    const currentWord = reviewQueue[currentCardIndex];
    if (!currentWord) {
      setActiveTab('review');
      return;
    }

    const prevScore = currentWord.proficiencyScore || 0;
    const now = new Date();
    const rating = mapGradeToFsrsRating(grade);
    const currentCard = buildFsrsCard(currentWord);
    const schedulingCards = fsrs.repeat(currentCard, now);
    const nextCardRecord = schedulingCards[rating];
    const nextCard = nextCardRecord.card;
    const fsrsState = serializeFsrsCard(nextCard);
    let nextReviewIso = fsrsState.due;
    if (fsrsState.scheduled_days > 2) {
      const nowMs = now.getTime();
      const dueMs = new Date(fsrsState.due).getTime();
      const fuzzFactor = 0.95 + Math.random() * 0.1;
      const fuzzedMs = nowMs + (dueMs - nowMs) * fuzzFactor;
      nextReviewIso = new Date(fuzzedMs).toISOString();
      fsrsState.due = nextReviewIso;
    }

    let scoreChange = grade - 3;
    let newScore = prevScore + scoreChange;

    if (prevScore === 0 && grade >= 3) newScore = Math.max(1, newScore);

    newScore = Math.max(0, Math.min(5, newScore));

    setVocabData(prev => prev.map(w => w.id === currentWord.id ? { ...w, ...fsrsState, nextReview: nextReviewIso, proficiencyScore: newScore } : w));

    if (session) {
      const updatePayload = {
        ...fsrsState,
        next_review: nextReviewIso,
        proficiency_score: newScore
      };

      supabase.from('user_library').update(updatePayload).eq('id', currentWord.libraryId).then(({ error }) => {
        if (error && error.code === '42703') {
          supabase.from('user_library').update({
            next_review: nextReviewIso,
            proficiency_score: newScore
          }).eq('id', currentWord.libraryId).then(({ error: retryError }) => {
            if (retryError) console.error("更新複習進度失敗:", retryError);
          });
        } else if (error) {
          console.error("更新複習進度失敗:", error);
        }
      });
    }

    const shouldAdvance = options.advance !== false;
    if (shouldAdvance) {
      advanceToNextCard();
    }
  };

  const checkAnswer = () => {
    const currentWord = reviewQueue[currentCardIndex];
    if (!currentWord) {
      setActiveTab('review');
      return;
    }
    const isStrictMode = reviewMode === 'spelling' || reviewMode === 'cloze' || reviewMode === 'dictation';
    const result = isStrictMode
      ? calculateReviewResult(userAnswer, currentWord.word)
      : { grade: 3, feedbackType: 'correct', allowRetry: false };

    if (reviewMode !== 'flashcard' && result.allowRetry) {
      setFeedback('incorrect');
      setIsFlipped(false);
      setPendingAutoGrade(null);
      setIsAwaitingNext(false);
      setUserAnswer('');
      setAnswerHint(currentWord.word);
      setHasMistake(true);
      return;
    }

    const finalIncorrect = isStrictMode && hasMistake;
    const feedbackType = finalIncorrect ? 'incorrect' : result.feedbackType;
    setFeedback(feedbackType);
    setIsFlipped(true);
    setAnswerHint('');

    if (reviewMode !== 'flashcard') {
      if (isAwaitingNext) return;
      const autoGrade = finalIncorrect ? 1 : result.grade;
      setPendingAutoGrade(autoGrade);
      setIsAwaitingNext(true);
    }
  };

  const handleAnswerChange = (value) => {
    setUserAnswer(value);
    if (feedback === 'incorrect') {
      setFeedback(null);
      setIsAwaitingNext(false);
    }
    if (answerHint) setAnswerHint('');
  };

  return {
    state: {
      activeTab,
      apiKey,
      groqApiKey,
      settingsView,
      reviewSetupView,
      isDataLoaded,
      session,
      email,
      password,
      authLoading,
      folders,
      vocabData,
      query,
      searchResult,
      isSearching,
      aiLoading,
      searchError,
      preferredAccent,
      suggestions,
      viewingFolderId,
      returnFolderId,
      isSaveMenuOpen,
      saveButtonFeedback,
      toast,
      reviewQueue,
      currentCardIndex,
      reviewMode,
      isFlipped,
      userAnswer,
      feedback,
      story,
      isGeneratingStory,
      isAwaitingNext,
      pendingAutoGrade,
      answerHint,
      hasMistake,
      selectedReviewFolders,
      folderSortBy,
      wordSortBy,
      requestRetention
    },
    derived: {
      normalizedEntries,
      currentReviewWord,
      currentReviewEntries,
      primaryReviewEntry,
      clozeExample,
      clozeExampleLines,
      clozeExampleMain,
      clozeTranslation,
      preferredSearchAudio,
      preferredReviewAudio,
      activeFolder,
      savedWordInSearch,
      allFolderIds,
      allFoldersSelected,
      selectedFolderLabel,
      sortedFolders,
      sortedActiveFolderWords
    },
    actions: {
      setActiveTab,
      setApiKey,
      setGroqApiKey,
      setSettingsView,
      setReviewSetupView,
      setEmail,
      setPassword,
      setQuery,
      setPreferredAccent,
      setSuggestions,
      setViewingFolderId,
      setReturnFolderId,
      setIsSaveMenuOpen,
      setSelectedReviewFolders,
      setFolderSortBy,
      setWordSortBy,
      setRequestRetention,
      setIsFlipped,
      setStory,
      setIsGeneratingStory,
      handleSearch,
      generateAiMnemonic,
      generateFolderStory,
      handleShowDetails,
      saveWord,
      handleManualSync,
      handleLogin,
      handleLogout,
      handleEmailSignUp,
      handleEmailSignIn,
      createFolder,
      handleDeleteFolder,
      handleRemoveWordFromFolder,
      toggleReviewFolder,
      startReview,
      advanceToNextCard,
      processRating,
      checkAnswer,
      handleAnswerChange
    },
    refs: {
      searchInputRef
    }
  };
};

export default useVocabularyApp;
