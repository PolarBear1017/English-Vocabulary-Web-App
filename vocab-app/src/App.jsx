import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Book, Brain, Volume2, Save, Plus, 
  Folder, Trash2, X, RefreshCw, Mic, Sparkles, 
  Settings, ArrowRight, ArrowLeft, Key, Loader2,
  LogIn, LogOut, User
} from 'lucide-react';
// [Supabase] 引入 Supabase 功能
import { supabase } from './supabase';
import { FSRS, Rating, generatorParameters, createEmptyCard } from 'ts-fsrs';

/**
 * ------------------------------------------------------------------
 * API 整合服務
 * ------------------------------------------------------------------
 */
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const callGemini = async (apiKey, prompt) => {
  if (!apiKey) throw new Error("請先在設定頁面輸入 Gemini API Key");

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API 呼叫失敗: ${errorData.error?.message}`);
  }

  const data = await response.json();
  return { text: data.candidates[0].content.parts[0].text, source: 'Gemini AI' };
};

const callGroq = async (apiKey, prompt) => {
  if (!apiKey) throw new Error("請先在設定頁面輸入 Groq API Key");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq API 呼叫失敗: ${errorData.error?.message}`);
  }

  const data = await response.json();
  return { text: data.choices[0].message.content, source: 'Groq AI' };
};

const callAi = async (geminiKey, groqKey, prompt) => {
  if (geminiKey) {
    try {
      console.log("正在嘗試使用 Gemini AI...");
      return await callGemini(geminiKey, prompt);
    } catch (e) {
      console.warn("Gemini AI 失敗:", e.message);
      if (groqKey) {
        console.log("Gemini 失敗，切換至 Groq AI...");
        return await callGroq(groqKey, prompt);
      } else {
        throw new Error("Gemini AI 失敗且未設定備用的 Groq API Key。");
      }
    }
  } else if (groqKey) {
    console.log("未設定 Gemini Key，正在使用 Groq AI...");
    return await callGroq(groqKey, prompt);
  } else {
    throw new Error("請至少在設定頁面輸入一種 AI API Key (Gemini 或 Groq)。");
  }
};

// Prompt: 查詢單字定義 (回傳 JSON)
const generateDefinitionPrompt = (word) => `
You are an expert English teacher. 
Define the English word "${word}" for a Traditional Chinese learner.
Return ONLY a valid JSON object (no markdown formatting) with these exact keys:
{
  "word": "${word}",
  "pos": "part of speech (e.g., noun, verb)",
  "phonetic": "IPA phonetic symbol",
  "definition": "Simple English definition",
  "translation": "Traditional Chinese translation",
  "example": "A simple, clear example sentence using the word",
  "similar": ["synonym1", "synonym2", "synonym3"]
}`;

// Prompt: 生成記憶法 (回傳 JSON)
const generateMnemonicPrompt = (word, definition) => `
Create a memory aid for the English word "${word}" (meaning: ${definition}).
Return ONLY a valid JSON object (no markdown) with this key:
{
  "mnemonics": "A creative memory aid. 1. Break down roots/prefixes/suffixes if applicable. 2. Provide a funny or logical association (mnemonic) in Traditional Chinese."
}`;

// Prompt: 生成故事 (回傳文字)
const generateStoryPrompt = (words) => `
Write a short, engaging story (max 150 words) using ALL of the following English words: ${words.join(', ')}.
The story should be easy to read for an intermediate learner.
Highlight the target words by wrapping them in **double asterisks** (e.g., **apple**).
After the story, provide a brief Traditional Chinese summary.
`;

/**
 * ------------------------------------------------------------------
 * 模擬資料 (Fallback)
 * ------------------------------------------------------------------
 */
const MOCK_DICTIONARY_DB = {
  "abandon": {
    word: "abandon",
    pos: "verb",
    phonetic: "/əˈbæn.dən/",
    definition: "to leave a place, thing, or person, usually for ever",
    translation: "拋棄，遺棄",
    example: "We had to abandon the car.",
    similar: ["desert", "leave", "quit"],
    mnemonics: "A band on (abandon) a ship is left behind. 一個樂團被遺棄在船上 -> 拋棄。"
  },
  "capability": {
    word: "capability",
    pos: "noun",
    phonetic: "/ˌkeɪ.pəˈbɪl.ə.ti/",
    definition: "the ability to do something",
    translation: "能力，才能",
    example: "With the new machines, we have the capability to double our output.",
    similar: ["ability", "competence", "skill"],
    mnemonics: "Cap (帽子) + Ability (能力) -> 有能力戴這頂高帽 -> 能力。"
  }
};

const normalizeEntries = (data) => {
  if (Array.isArray(data.entries) && data.entries.length > 0) {
    return data.entries.map((entry) => ({
      ...entry,
      examples: Array.isArray(entry.examples) ? entry.examples : (entry.example ? [entry.example] : [])
    }));
  }

  if (data.definition || data.translation || data.example) {
    const example = data.example || '';
    return [{
      definition: data.definition || '',
      translation: data.translation || '',
      example,
      examples: example ? [example] : []
    }];
  }

  return [];
};

const fsrsParams = generatorParameters({ enable_fuzzing: true });
const fsrs = new FSRS(fsrsParams);

const buildFsrsCard = (data = {}) => {
  const card = createEmptyCard();
  if (data.due) card.due = new Date(data.due);
  if (!data.due && data.nextReview) card.due = new Date(data.nextReview);
  if (data.stability !== undefined && data.stability !== null) card.stability = data.stability;
  if (data.difficulty !== undefined && data.difficulty !== null) card.difficulty = data.difficulty;
  if (data.elapsed_days !== undefined && data.elapsed_days !== null) card.elapsed_days = data.elapsed_days;
  if (data.scheduled_days !== undefined && data.scheduled_days !== null) card.scheduled_days = data.scheduled_days;
  if (data.reps !== undefined && data.reps !== null) card.reps = data.reps;
  if (data.lapses !== undefined && data.lapses !== null) card.lapses = data.lapses;
  if (data.state !== undefined && data.state !== null) card.state = data.state;
  if (data.last_review) card.last_review = new Date(data.last_review);
  return card;
};

const serializeFsrsCard = (card) => ({
  due: card.due ? new Date(card.due).toISOString() : new Date().toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: card.elapsed_days,
  scheduled_days: card.scheduled_days,
  reps: card.reps,
  lapses: card.lapses,
  state: card.state,
  last_review: card.last_review ? new Date(card.last_review).toISOString() : null
});

const mapGradeToFsrsRating = (grade) => {
  if (grade <= 1) return Rating.Again;
  if (grade === 2) return Rating.Hard;
  if (grade === 3) return Rating.Good;
  return Rating.Easy;
};

const formatDate = (date) => new Date(date).toLocaleDateString('zh-TW');

const speak = (text, audioUrl = null) => {
  if (audioUrl) {
    // 如果有真人發音檔，優先播放
    new Audio(audioUrl).play().catch(e => console.error("播放失敗:", e));
    return;
  }
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } else {
    alert("瀏覽器不支援語音");
  }
};

// [New] 理解程度顯示元件
const ProficiencyDots = ({ score = 0 }) => (
  <div className="flex items-center gap-1.5" title={`理解程度: ${score}/5`}>
    <div className={`h-2 w-12 rounded-full transition-colors duration-300 shadow-sm ${
      score <= 0 ? 'bg-gray-200' :
      score === 1 ? 'bg-red-500' :
      score === 2 ? 'bg-orange-500' :
      score === 3 ? 'bg-yellow-400' :
      score === 4 ? 'bg-lime-500' :
      'bg-green-600'
    }`} />
    <span className="text-xs font-bold text-gray-400">Lv.{score}</span>
  </div>
);

/**
 * ------------------------------------------------------------------
 * 主應用程式元件
 * ------------------------------------------------------------------
 */
export default function VocabularyApp() {
  // --- State: Navigation & Config ---
  const [activeTab, setActiveTab] = useState('search'); 
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [settingsView, setSettingsView] = useState('main'); // 'main', 'account', 'api'

  // [Supabase] 資料載入狀態與 Session
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [session, setSession] = useState(null);
  
  // --- State: Email Auth ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- State: Data ---
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('vocab_folders');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: '預設資料夾', words: [] }];
  });
  
  const [vocabData, setVocabData] = useState(() => {
    const saved = localStorage.getItem('vocab_data');
    return saved ? JSON.parse(saved) : []; 
  });

  // --- State: Search ---
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [preferredAccent, setPreferredAccent] = useState('us');
  const [suggestions, setSuggestions] = useState([]);
  const ignoreNextQueryUpdate = useRef(false);
  const [viewingFolderId, setViewingFolderId] = useState(null);
  const [returnFolderId, setReturnFolderId] = useState(null);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);

  // --- State: Review & Story ---
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

  const normalizedEntries = searchResult ? normalizeEntries(searchResult) : [];
  const currentReviewWord = reviewQueue[currentCardIndex] || {};
  const currentReviewEntries = reviewQueue.length > 0
    ? normalizeEntries(currentReviewWord)
    : [];
  const primaryReviewEntry = currentReviewEntries[0] || {};
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

  // --- Effect: Persistence (Supabase Sync) ---
  useEffect(() => {
    // 1. 處理身份驗證 (匿名登入)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        // 若無 Session，自動匿名登入 (需在 Supabase 後台開啟 Anonymous Sign-ins)
        supabase.auth.signInAnonymously().catch(console.error);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (userId) => {
    try {
      // 1. 載入資料夾 (Folders)
      const { data: dbFolders, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (folderError) throw folderError;

      // 合併「預設資料夾」與「雲端資料夾」
      const allFolders = [{ id: 'default', name: '預設資料夾', words: [] }];
      if (dbFolders) allFolders.push(...dbFolders);
      setFolders(allFolders);

      // 2. 載入單字庫 (User Library)
      const { data, error } = await supabase
        .from('user_library')
        .select(`
          *,
          dictionary:word_id (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        // 將 DB 結構轉換回 App 需要的格式
        const loadedVocab = data.map(item => ({
          ...item.dictionary,      // 展開字典資料 (word, definition...)
          id: item.word_id.toString(), // 使用 word_id 作為識別
          libraryId: item.id,      // 保留關聯表 ID
          // [修改] 支援多資料夾：優先使用 folder_ids 陣列，若無則相容舊版 folder_id
          folderIds: item.folder_ids || (item.folder_id ? [item.folder_id] : ['default']),
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
        }));
        setVocabData(loadedVocab);
        setIsDataLoaded(true);
      }
    } catch (e) {
      console.error("Supabase 載入失敗:", e);
    }
  };

  // 3. 本地備份 (僅作為離線快取，主要依賴 DB)
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

  // --- Effect: Autocomplete Suggestions ---
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
        // [Supabase] 優先從字典表搜尋 (Autocomplete)
        const { data, error } = await supabase
          .from('dictionary')
          .select('word')
          .ilike('word', `${query}%`) // Prefix search
          .limit(5);
        
        if (data && data.length > 0) {
          setSuggestions(data);
        } else {
          // 若 DB 沒資料，Fallback 到 Datamuse API
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

    const timeoutId = setTimeout(fetchSuggestions, 100); // 100ms 防抖動
    return () => clearTimeout(timeoutId);
  }, [query]);

  // --- Logic: Search (Local + AI) ---
  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // 支援直接傳入字串 (點擊建議時) 或使用當前 input state
    const searchTerm = (typeof e === 'string' ? e : query).trim();
    if (!searchTerm) return;

    setReturnFolderId(null); // 手動搜尋時，清除「返回資料夾」的狀態
    if (typeof e === 'string') {
      ignoreNextQueryUpdate.current = true;
      setQuery(searchTerm);
    }

    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);
    setSuggestions([]); // 搜尋後清空建議
    
    const lowerQuery = searchTerm.toLowerCase();

    try {
      // 1. 嘗試從本地模擬資料庫找
      if (MOCK_DICTIONARY_DB[lowerQuery]) {
        setTimeout(() => {
          setSearchResult({ ...MOCK_DICTIONARY_DB[lowerQuery], entries: normalizeEntries(MOCK_DICTIONARY_DB[lowerQuery]), isAiGenerated: false });
          setIsSearching(false);
        }, 500);
        return;
      }

      // 2. [Hybrid 策略] 優先嘗試呼叫自建的劍橋字典 API
      let dictionaryData = null;
      try {
        // 注意：本地開發時需使用 vercel dev 才能讓 /api 生效，否則這裡會 404
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(lowerQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // [新增] 雙重確認：確保真的有抓到定義，避免顯示空字串
          const normalized = normalizeEntries(data);
          if (normalized.length > 0) {
            dictionaryData = { ...data, entries: normalized };
          }
        }
      } catch (e) {
        console.warn("劍橋字典 API 呼叫失敗，將切換至 AI 模式", e);
      }

      if (dictionaryData) {
        // A. 成功從劍橋字典抓到資料
        setSearchResult({
          ...dictionaryData,
          usAudioUrl: dictionaryData.usAudioUrl || dictionaryData.audioUrl || null,
          ukAudioUrl: dictionaryData.ukAudioUrl || null,
          similar: [], // 爬蟲沒抓相似字，先留空
          mnemonics: null,
          isAiGenerated: false, // 標記為非 AI 生成 (顯示上可以區隔)
          source: 'Cambridge'   // 標記來源
        });
      } else if (apiKey || groqApiKey) {
        // B. 字典抓不到，但有 AI Key -> 呼叫 AI
        const { text: jsonStr, source: aiSource } = await callAi(apiKey, groqApiKey, generateDefinitionPrompt(lowerQuery));
        // 清理 Markdown 標記 (```json ... ```)
        const cleanJson = jsonStr.replace(/```json|```/g, '').trim();
        const aiData = JSON.parse(cleanJson);
        
        setSearchResult({
          ...aiData,
          entries: normalizeEntries(aiData),
          audio: null,
          usAudioUrl: null,
          ukAudioUrl: null,
          mnemonics: null, // 暫不生成記憶法，等使用者點擊
          isAiGenerated: true,
          source: aiSource
        });
      } else {
        // C. 什麼都沒有
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

  // --- Logic: AI Mnemonic ---
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

  // --- Logic: AI Story ---
  const generateFolderStory = async (folder) => {
    if (!apiKey && !groqApiKey) {
      setActiveTab('settings');
      alert("請先設定 API Key 才能使用故事生成功能！");
      return;
    }

    const wordsInFolder = vocabData
      .filter(w => folder.words.includes(w.id))
      .map(w => w.word);
    
    if (wordsInFolder.length < 3) {
      alert("資料夾內至少需要 3 個單字才能生成故事喔！");
      return;
    }

    // 只取前 10 個單字以免 Prompt 過長
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

  // --- Logic: CRUD & Review ---
  const handleShowDetails = (word) => {
    // 建構符合 searchResult 格式的物件，補足可能缺失的欄位
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
    if (viewingFolderId) setReturnFolderId(viewingFolderId); // 記錄來源資料夾
    setViewingFolderId(null);
  };

  const saveWord = async (folderId) => {
    if (!searchResult || !session) {
      if (!session) alert("請先登入才能儲存單字！");
      return;
    }

    try {
      // 1. Upsert Dictionary (確保單字存在於字典表)
      // 先查詢是否已存在 (使用 ilike 忽略大小寫，避免 "Apple" vs "apple" 造成重複錯誤)
      let { data: dictWord, error: fetchError } = await supabase
        .from('dictionary')
        .select('id, word')
        .ilike('word', searchResult.word)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!dictWord) {
        // 不存在則新增
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
          // 若發生 Unique Violation (23505)，代表剛好有別人新增了，改為重新查詢
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

      // 2. Insert User Library (建立使用者與單字的關聯)
      // [修改] 先檢查使用者是否已經收藏過這個單字
      const { data: existingEntry, error: libFetchError } = await supabase
        .from('user_library')
        .select('id, folder_ids')
        .eq('user_id', session.user.id)
        .eq('word_id', dictWord.id)
        .maybeSingle();

      if (libFetchError) throw libFetchError;

      if (existingEntry) {
        // A. 單字已存在 -> 更新 folder_ids 加入新資料夾
        const currentFolders = existingEntry.folder_ids || [];
        
        if (currentFolders.includes(folderId)) {
          alert("這個單字已經在這個資料夾囉！");
          return;
        }

        const newFolders = [...currentFolders, folderId];
        
        const { error: updateError } = await supabase
          .from('user_library')
          .update({ folder_ids: newFolders })
          .eq('id', existingEntry.id);

        if (updateError) throw updateError;

        // 更新本地狀態
        setVocabData(prev => prev.map(w => w.id === dictWord.id.toString() ? { ...w, folderIds: newFolders } : w));
        alert(`已將 "${searchResult.word}" 加入資料夾！(與其他資料夾共享複習進度)`);
        return;
      }

      // B. 單字不存在 -> 新增單字
      const now = new Date();
      const initialCard = createEmptyCard();
      initialCard.due = now;
      const fsrsState = serializeFsrsCard(initialCard);

      const payload = {
        user_id: session.user.id,
        word_id: dictWord.id,
        folder_ids: [folderId], // [修改] 使用陣列儲存
        next_review: fsrsState.due,
        ...fsrsState
      };

      let { data: libraryEntry, error: libError } = await supabase
        .from('user_library')
        .insert([payload])
        .select()
        .single();

      if (libError) {
        if (libError.code === '23505') alert("這個單字已經在您的收藏庫囉！"); // Unique constraint violation
        else throw libError;
        return;
      }

      // 3. 更新本地狀態 (為了即時 UI 反饋)
      const newWordState = {
        ...searchResult,
        id: dictWord.id.toString(),
        libraryId: libraryEntry.id,
        folderIds: [folderId],
        nextReview: libraryEntry.next_review || fsrsState.due,
        ...fsrsState,
        proficiencyScore: 0 // 初始化理解程度
      };

      setVocabData(prev => [...prev, newWordState]);
      
      alert(`已將 "${searchResult.word}" 儲存！`);

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
      // [DB模式] 寫入 Supabase
      const { data, error } = await supabase
        .from('folders')
        .insert({ name, user_id: session.user.id })
        .select()
        .single();
      
      if (error) return alert("建立資料夾失敗: " + error.message);
      setFolders(prev => [...prev, data]);
    } else {
      // [本機模式] 寫入 State
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

  const buildReviewBatch = (words, batchSize) => {
    if (words.length <= batchSize) return words;
    const now = new Date();
    const dueWords = words
      .filter(w => new Date(w.nextReview) <= now)
      .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));

    if (dueWords.length >= batchSize) {
      return dueWords.slice(0, batchSize);
    }

    const notDue = words
      .filter(w => new Date(w.nextReview) > now)
      .sort((a, b) => (a.proficiencyScore || 0) - (b.proficiencyScore || 0));

    const mixed = [];
    let low = 0;
    let high = notDue.length - 1;
    while (mixed.length < (batchSize - dueWords.length) && low <= high) {
      if (low <= high) {
        mixed.push(notDue[low]);
        low += 1;
      }
      if (mixed.length >= (batchSize - dueWords.length)) break;
      if (low <= high) {
        mixed.push(notDue[high]);
        high -= 1;
      }
    }

    return [...dueWords, ...mixed].slice(0, batchSize);
  };

  const startReview = (folderId, mode) => {
    // [修改] 篩選邏輯：檢查 folderIds 陣列是否包含該資料夾
    const filteredWords = vocabData.filter(w => (folderId === 'all' || (w.folderIds && w.folderIds.includes(folderId))));
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
    const nextReviewIso = fsrsState.due;

    // 計算新的理解程度 (0-5)
    // 邏輯：答錯(1-2)扣分，普通(3)持平，答對(4-5)加分
    let scoreChange = grade - 3; 
    let newScore = prevScore + scoreChange;
    
    // 特殊規則：如果是新單字(0)且答對(>=3)，至少升到 Lv.1
    if (prevScore === 0 && grade >= 3) newScore = Math.max(1, newScore);
    
    // 限制範圍 0-5
    newScore = Math.max(0, Math.min(5, newScore));

    // 更新本地狀態
    setVocabData(prev => prev.map(w => w.id === currentWord.id ? { ...w, ...fsrsState, nextReview: nextReviewIso, proficiencyScore: newScore } : w));

    // 更新 Supabase
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
    const isCorrect = userAnswer.toLowerCase().trim() === currentWord.word.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsFlipped(true);

    if (reviewMode !== 'flashcard') {
      if (isAwaitingNext) return;
      const autoGrade = isCorrect ? 4 : 1;
      setPendingAutoGrade(autoGrade);
      setIsAwaitingNext(true);
    }
  };

  // --- Sub-Components ---
  const Navigation = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 shadow-lg md:relative md:border-t-0 md:flex-col md:w-64 md:h-screen md:border-r md:justify-start md:gap-4 md:p-6">
      <div className="hidden md:block text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <Brain className="w-8 h-8" />
        VocabMaster
      </div>
      {[
        { id: 'search', icon: Search, label: '查詢' },
        { id: 'library', icon: Book, label: '單字庫' },
        { id: 'review', icon: RefreshCw, label: '複習' },
        { id: 'settings', icon: Settings, label: '設定' },
      ].map(item => (
        <button 
          key={item.id}
          onClick={() => { setActiveTab(item.id); setViewingFolderId(null); if (item.id === 'settings') setSettingsView('main'); }}
          className={`flex flex-col md:flex-row items-center gap-2 p-2 rounded-lg transition ${activeTab === item.id || (item.id === 'review' && activeTab === 'review_session') ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <item.icon className="w-6 h-6" />
          <span className="text-xs md:text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800 font-sans pb-16 md:pb-0">
      <Navigation />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* === TAB: SEARCH === */}
        {activeTab === 'search' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {returnFolderId && (
              <button 
                onClick={() => {
                  setViewingFolderId(returnFolderId);
                  setActiveTab('library');
                  setReturnFolderId(null);
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition font-medium mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回 {folders.find(f => f.id === returnFolderId)?.name || '資料夾'}
              </button>
            )}

            <header>
              <h1 className="text-2xl font-bold mb-2">單字查詢</h1>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                {(apiKey || groqApiKey) && (
                  <span className="text-green-600 flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI 功能已啟用</span>
                )}
              </div>
            </header>

            {/* Sync Status Indicator */}
            <div className="flex justify-end px-2">
               <span className={`text-xs flex items-center gap-1 ${isDataLoaded ? 'text-green-500' : 'text-gray-400'}`}>
                 {isDataLoaded ? '☁️ 雲端同步中' : '⏳ 正在連線資料庫...'}
               </span>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => setSuggestions([]), 200)} // 延遲隱藏以允許點擊
                placeholder="輸入單字 (例如: serendipity)..."
                className={`w-full p-4 pl-12 shadow-sm border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none ${suggestions.length > 0 ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'}`}
              />
              <Search className="absolute left-4 top-4 text-gray-400" />
              <button type="submit" disabled={isSearching} className="absolute right-3 top-2.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin"/> : '查詢'}
              </button>

              {/* Autocomplete Dropdown */}
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-white border border-t-0 border-gray-200 rounded-b-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                  {suggestions.map((s, index) => (
                    <li 
                      key={index}
                      onMouseDown={() => handleSearch(s.word)} // 使用 onMouseDown 確保在 onBlur 前觸發
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 flex items-center gap-2 transition"
                    >
                      <Search className="w-4 h-4 text-gray-300" />
                      <span>{s.word}</span>
                    </li>
                  ))}
                </ul>
              )}
            </form>

            {searchError && <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{searchError}</div>}

            {searchResult && !isSearching && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        {searchResult.word}
                        <button onClick={() => speak(searchResult.word, preferredSearchAudio)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 active:scale-95 transition">
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        </button>
                        {(searchResult.usAudioUrl || searchResult.ukAudioUrl) && (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setPreferredAccent('us')}
                              className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'us' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                            >
                              US
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreferredAccent('uk')}
                              className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'uk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                            >
                              UK
                            </button>
                          </div>
                        )}
                        {savedWordInSearch && (
                          <div className="ml-4 flex flex-col items-start">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mastery</span>
                            <ProficiencyDots score={savedWordInSearch.proficiencyScore} />
                          </div>
                        )}
                      </h2>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        <span className="italic font-serif bg-white px-2 py-0.5 rounded border border-gray-200">{searchResult.pos}</span>
                        <span>{searchResult.phonetic}</span>
                        {searchResult.source === 'Cambridge' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">🛡️ Cambridge</span>}
                        {searchResult.source === 'Gemini AI' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> Gemini AI</span>}
                        {searchResult.source === 'Groq AI' && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> Groq AI</span>}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button 
                        onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm"
                      >
                        <Save className="w-4 h-4" /> 儲存
                      </button>
                      
                      {isSaveMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsSaveMenuOpen(false)} />}
                      
                      {isSaveMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 p-1">
                          {folders.map(f => (
                            <button key={f.id} onClick={() => { saveWord(f.id); setIsSaveMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg text-sm">{f.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">解釋 & 例句</h3>
                    <div className="space-y-4">
                      {normalizedEntries.map((entry, index) => (
                        <div key={`${entry.definition}-${index}`} className="bg-white/60 rounded-xl border border-gray-100 p-4">
                          {entry.translation && <p className="text-lg text-gray-800 font-medium">{entry.translation}</p>}
                          {entry.definition && <p className="text-gray-600 mt-1">{entry.definition}</p>}
                          {entry.examples && entry.examples.length > 0 && (
                            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
                              {entry.examples.map((example, exampleIndex) => (
                                <p key={`${index}-ex-${exampleIndex}`} className="text-gray-700 italic">"{example}"</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {normalizedEntries.length === 0 && (
                        <p className="text-gray-500">查無解釋</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">相似字</h3>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.similar.map(s => (
                        <span key={s} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm cursor-pointer hover:bg-gray-200" onClick={() => {setQuery(s); handleSearch({preventDefault:()=>{}});}}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AI Memory Aid Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-100 relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-purple-800">AI 記憶助手</h3>
                    </div>
                    
                    {searchResult.mnemonics ? (
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{searchResult.mnemonics}</p>
                    ) : (
                      <div className="text-center py-2">
                        {apiKey ? (
                          <button 
                            onClick={generateAiMnemonic}
                            disabled={aiLoading}
                            className="bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition flex items-center gap-2 mx-auto disabled:opacity-50"
                          >
                            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin"/> 生成中...</> : <><Sparkles className="w-4 h-4"/> 生成字根/諧音記憶法</>}
                          </button>
                        ) : (
                          <p className="text-sm text-gray-400">請設定 API Key 以啟用記憶法生成</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === TAB: LIBRARY === */}
        {activeTab === 'library' && (
          <div className="max-w-4xl mx-auto">
            {!activeFolder ? (
              <>
                <header className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">我的單字庫</h1>
                  <button onClick={createFolder} className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
                    <Plus className="w-4 h-4" /> 新增資料夾
                  </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {folders.map(folder => (
                    <div key={folder.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingFolderId(folder.id)}>
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg hover:text-blue-600 transition">{folder.name}</h3>
                            <p className="text-sm text-gray-500">{folder.words.length} 個單字</p>
                          </div>
                        </div>
                        {folder.id !== 'default' && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4 max-h-40 overflow-y-auto cursor-pointer" onClick={() => setViewingFolderId(folder.id)}>
                        {/* [修改] 列表顯示邏輯：改用 folderIds 判斷 */}
                        {vocabData.filter(w => w.folderIds && w.folderIds.includes(folder.id)).slice(0, 3).map(w => (
                          <div key={w.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                            <span className="font-medium">{w.word}</span>
                            <ProficiencyDots score={w.proficiencyScore} />
                            <span className="text-gray-500 text-xs">{formatDate(w.nextReview)}</span>
                          </div>
                        ))}
                        {vocabData.filter(w => w.folderIds && w.folderIds.includes(folder.id)).length > 3 && <div className="text-center text-xs text-gray-400 pt-1">+{vocabData.filter(w => w.folderIds && w.folderIds.includes(folder.id)).length - 3} words...</div>}
                        {vocabData.filter(w => w.folderIds && w.folderIds.includes(folder.id)).length === 0 && <div className="text-center text-xs text-gray-400 py-2">尚無單字，點擊查看詳情</div>}
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button onClick={() => startReview(folder.id, 'flashcard')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">複習</button>
                        <button 
                          onClick={() => generateFolderStory(folder)}
                          className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> 生成故事
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                <header className="flex items-center gap-4 mb-6">
                  <button onClick={() => setViewingFolderId(null)} className="p-2 hover:bg-gray-100 rounded-full transition group">
                    <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                      <Folder className="w-6 h-6 text-blue-500" />
                      {activeFolder.name}
                    </h1>
                    <p className="text-gray-500 text-sm">{vocabData.filter(w => w.folderIds && w.folderIds.includes(activeFolder.id)).length} 個單字</p>
                  </div>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {vocabData.filter(w => w.folderIds && w.folderIds.includes(activeFolder.id)).length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {vocabData
                        .filter(w => w.folderIds && w.folderIds.includes(activeFolder.id))
                        .map(word => (
                          <div key={word.id} onClick={() => handleShowDetails(word)} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition">{word.word}</span>
                                <button onClick={(e) => { e.stopPropagation(); speak(word.word); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition">
                                  <Volume2 className="w-4 h-4" />
                                </button>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{word.pos}</span>
                              </div>
                              <p className="text-gray-600 text-sm">{word.translation || word.definition}</p>
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="flex flex-col items-end gap-1">
                                  <span className="text-xs text-gray-400">理解程度</span>
                                  <ProficiencyDots score={word.proficiencyScore} />
                               </div>
                               <div className="text-right min-w-[80px]">
                                  <div className="text-xs text-gray-400">下次複習</div>
                                  <div className={`text-sm font-medium ${new Date(word.nextReview) <= new Date() ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatDate(word.nextReview)}
                                  </div>
                               </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                      <Book className="w-12 h-12 mb-3 opacity-20" />
                      <p>這個資料夾還是空的</p>
                      <button onClick={() => { setActiveTab('search'); setViewingFolderId(null); }} className="mt-4 text-blue-600 hover:underline text-sm">
                        去查詢並新增單字
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Story Modal */}
            {(story || isGeneratingStory) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
                  <button onClick={() => { setStory(null); setIsGeneratingStory(false); }} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> AI 單字故事
                  </h2>
                  
                  {isGeneratingStory ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-2 text-purple-500" />
                      <p>正在發揮創意編寫故事中...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="prose prose-purple max-w-none text-gray-700 max-h-[60vh] overflow-y-auto">
                        <p className="whitespace-pre-line leading-relaxed">{story}</p>
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                        <button onClick={() => speak(story.replace(/\*\*/g, ''))} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">
                          <Volume2 className="w-4 h-4" /> 朗讀故事
                        </button>
                        <button onClick={() => setStory(null)} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700">
                          關閉
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === TAB: REVIEW SETUP === */}
        {activeTab === 'review' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">複習中心</h1>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8 flex justify-around">
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">{vocabData.filter(w => new Date(w.nextReview) <= new Date()).length}</div>
                <div className="text-sm text-gray-600">待複習</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{vocabData.length}</div>
                <div className="text-sm text-gray-600">總單字量</div>
              </div>
            </div>

            <h3 className="font-bold text-gray-700 mb-4">選擇複習模式</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'flashcard', name: '單字卡模式 (Flashcards)', icon: Book, desc: '經典翻牌，自我評分' },
                { id: 'spelling', name: '看義拼字 (Spelling)', icon: RefreshCw, desc: '根據中文解釋拼寫單字' },
                { id: 'cloze', name: '例句填空 (Cloze)', icon: Settings, desc: '根據例句填入缺失單字' },
                { id: 'dictation', name: '聽音拼字 (Dictation)', icon: Mic, desc: '聽發音拼寫單字' }
              ].map(mode => (
                <button key={mode.id} onClick={() => startReview('all', mode.id)} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition text-left group">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition"><mode.icon className="w-6 h-6" /></div>
                  <div>
                    <div className="font-bold text-gray-800">{mode.name}</div>
                    <div className="text-sm text-gray-500">{mode.desc}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === TAB: REVIEW SESSION === */}
        {activeTab === 'review_session' && reviewQueue.length > 0 && (
          <div className="max-w-2xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setActiveTab('review')} className="text-gray-500 hover:text-gray-800"><X className="w-6 h-6" /></button>
              <div className="text-sm font-medium text-gray-500">{currentCardIndex + 1} / {reviewQueue.length}</div>
              <div className="w-6"></div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-lg border border-gray-200 relative overflow-hidden flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
                {!isFlipped ? (
                  <>
                    {reviewMode === 'flashcard' && <h2 className="text-4xl font-bold text-gray-800">{currentReviewWord.word}</h2>}
                    {reviewMode === 'spelling' && (
                      <div className="space-y-4 w-full">
                        <div className="text-xl text-gray-600">{primaryReviewEntry.translation || currentReviewWord.translation}</div>
                        <input type="text" className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none text-2xl text-center py-2 bg-transparent" value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }} autoFocus />
                      </div>
                    )}
                    {reviewMode === 'cloze' && (
                      <div className="space-y-6 w-full">
                        <div className="text-xl text-gray-700 leading-relaxed">
                          {(primaryReviewEntry.example || currentReviewWord.example || '').replace(new RegExp(currentReviewWord.word || '', 'gi'), '________')}
                        </div>
                        <div className="text-sm text-gray-500">{primaryReviewEntry.translation || currentReviewWord.translation}</div>
                        <input type="text" className="w-full border p-3 rounded-lg text-center" value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }} autoFocus />
                      </div>
                    )}
                    {reviewMode === 'dictation' && (
                      <div className="space-y-6 w-full flex flex-col items-center">
                        <button onClick={() => speak(currentReviewWord.word, preferredReviewAudio)} className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition animate-pulse"><Volume2 className="w-8 h-8" /></button>
                        <input type="text" className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none text-2xl text-center py-2" value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkAnswer(); } }} autoFocus />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-300 w-full">
                    <div className="flex items-center justify-center gap-3">
                      <h2 className="text-3xl font-bold text-gray-800">{currentReviewWord.word}</h2>
                      <button onClick={() => speak(currentReviewWord.word, preferredReviewAudio)}><Volume2 className="w-6 h-6 text-blue-600" /></button>
                      {(currentReviewWord.usAudioUrl || currentReviewWord.ukAudioUrl) && (
                        <div className="flex items-center gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setPreferredAccent('us')}
                            className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'us' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                          >
                            US
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreferredAccent('uk')}
                            className={`px-2 py-0.5 rounded-full border transition ${preferredAccent === 'uk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                          >
                            UK
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500 font-serif italic">{currentReviewWord.pos} {currentReviewWord.phonetic}</div>
                    <div className="space-y-4 text-left w-full">
                      {currentReviewEntries.map((entry, index) => (
                        <div key={`${entry.definition}-${index}`} className="bg-gray-50 p-4 rounded-lg">
                          {entry.translation && <p className="font-bold text-gray-800">{entry.translation}</p>}
                          {entry.definition && <p className="text-gray-600 text-sm mt-1">{entry.definition}</p>}
                          {entry.examples && entry.examples.length > 0 && (
                            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
                              {entry.examples.map((example, exampleIndex) => (
                                <p key={`${index}-review-ex-${exampleIndex}`} className="text-gray-700 italic">"{example}"</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {currentReviewEntries.length === 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg text-gray-500 text-sm">查無解釋</div>
                      )}
                    </div>
                    {currentReviewWord.mnemonics && (
                      <div className="bg-purple-50 p-3 rounded text-sm text-purple-700 text-left">
                        <span className="font-bold block text-xs uppercase mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Memory Aid</span>
                        {currentReviewWord.mnemonics}
                      </div>
                    )}
                    {reviewMode !== 'flashcard' && (
                      <div className={`p-3 rounded-lg font-bold text-white ${feedback === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}>{feedback === 'correct' ? '答對了！' : '答錯了，請再接再厲！'}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                {!isFlipped ? (
                  <button onClick={() => reviewMode === 'flashcard' ? setIsFlipped(true) : checkAnswer()} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-sm">{reviewMode === 'flashcard' ? '顯示答案' : '檢查'}</button>
                ) : (
                  reviewMode === 'flashcard' ? (
                    <div>
                      <p className="text-center text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">自評理解程度</p>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button key={val} onClick={() => processRating(val)} className={`text-white py-3 rounded-lg font-bold hover:opacity-90 active:scale-95 transition ${['bg-red-500','bg-orange-500','bg-yellow-500','bg-blue-500','bg-green-500'][val-1]}`}>{val}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={advanceToNextCard}
                      disabled={!isAwaitingNext}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                    >
                      下一題
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* === TAB: SETTINGS === */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto">
            {settingsView === 'main' ? (
              <>
                <h1 className="text-2xl font-bold mb-6">設定</h1>
                <div className="space-y-4">
                  <button 
                    onClick={() => setSettingsView('account')}
                    className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">帳戶管理</div>
                        <div className="text-sm text-gray-500">
                          {session?.user && !session.user.is_anonymous 
                            ? session.user.email 
                            : '尚未登入 / 訪客模式'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </button>

                  <button 
                    onClick={() => setSettingsView('api')}
                    className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <Key className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">API 金鑰設定</div>
                        <div className="text-sm text-gray-500">
                          {apiKey || groqApiKey ? '已設定' : '未設定'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
                
                <div className="mt-8 text-center text-gray-400 text-sm">
                  <p>VocabMaster v1.2.0 (Dual-AI Fallback)</p>
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-right duration-300">
                <button 
                  onClick={() => setSettingsView('main')} 
                  className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-4 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> 返回設定
                </button>
                
                {settingsView === 'account' && (
                  <>
                    <h1 className="text-2xl font-bold mb-6">帳戶管理</h1>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-500" /> 帳戶設定
                      </h2>
                      {session?.user && !session.user.is_anonymous ? (
                        <div>
                          <div className="flex items-center gap-4 mb-6">
                            {session.user.user_metadata?.avatar_url ? (
                              <img src={session.user.user_metadata.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border border-gray-200" />
                            ) : (
                              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                                {session.user.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-lg text-gray-800">{session.user.email}</p>
                              <p className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">● 已登入</p>
                            </div>
                          </div>
                          <button onClick={handleLogout} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
                            <LogOut className="w-4 h-4" /> 登出
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            {session?.user?.is_anonymous ? '目前為訪客身分 (資料僅存於本機)。' : '尚未登入。'}
                            <br />登入後可跨裝置同步您的單字庫。
                          </p>
                          <button onClick={handleLogin} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                            <LogIn className="w-4 h-4" /> 使用 Google 登入
                          </button>

                          <div className="mt-6 pt-6 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">或使用 Email 登入/註冊</p>
                            <div className="space-y-3">
                              <input
                                type="email"
                                placeholder="Email 信箱"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                              />
                              <input
                                type="password"
                                placeholder="密碼 (至少 6 碼)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                              />
                              <div className="flex gap-3">
                                <button onClick={handleEmailSignIn} disabled={authLoading} className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm hover:bg-gray-900 transition disabled:opacity-50">登入</button>
                                <button onClick={handleEmailSignUp} disabled={authLoading} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50">註冊</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {settingsView === 'api' && (
                  <>
                    <h1 className="text-2xl font-bold mb-6">API 金鑰設定</h1>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-gray-500" /> API 金鑰設定
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            AI 功能會優先使用 Google Gemini。如果 Gemini 呼叫失敗，將會自動使用 Groq 作為備用。
                          </p>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Google Gemini API Key</label>
                          <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="貼上您的 Gemini API Key..."
                            className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono"
                          />
                           <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                            👉 按此免費取得 Gemini API Key
                          </a>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Groq API Key (備用)</label>
                          <input 
                            type="password" 
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                            placeholder="貼上您的 Groq API Key..."
                            className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono"
                          />
                          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                            👉 按此免費取得 Groq API Key
                          </a>
                        </div>

                        {(apiKey || groqApiKey) && (
                          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                            <Check className="w-5 h-5" /> API 金鑰已儲存，AI 功能已啟用！
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function Check({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
