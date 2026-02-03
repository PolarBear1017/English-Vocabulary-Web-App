import { supabase } from '../supabase';

const AI_ERROR_CODES = {
  MISSING_API_KEYS: 'MISSING_API_KEYS'
};

const callAi = async ({ geminiKey, groqKey, word, definition, promptType }) => {
  if (!geminiKey && !groqKey) {
    const error = new Error("請至少在設定頁面輸入一種 AI API Key (Gemini 或 Groq)。");
    error.code = AI_ERROR_CODES.MISSING_API_KEYS;
    throw error;
  }

  const { data, error } = await supabase.functions.invoke('ai-dictionary', {
    body: {
      word,
      definition,
      promptType,
      apiKeys: {
        geminiKey,
        groqKey
      }
    }
  });

  if (error) {
    const err = new Error(error.message || 'AI Edge Function failed');
    err.code = error.code;
    throw err;
  }

  return data;
};

const escapeNewlinesInStrings = (input) => {
  let inString = false;
  let escaped = false;
  let result = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === '\n' || ch === '\r')) {
      result += '\\n';
      continue;
    }
    result += ch;
  }
  return result;
};

const extractJsonObject = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return '';
  return text.slice(start, end + 1);
};

const parseJsonContent = (text) => {
  const cleanJson = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    try {
      const extracted = extractJsonObject(cleanJson);
      if (!extracted) {
        return { rawText: cleanJson, parseError: error.message };
      }
      const escaped = escapeNewlinesInStrings(extracted);
      return JSON.parse(escaped);
    } catch (secondError) {
      return { rawText: cleanJson, parseError: secondError.message };
    }
  }
};

const normalizeDefinition = (word, data) => {
  if (!data || typeof data !== 'object') {
    return {
      word,
      pos: '',
      phonetic: '',
      definition: '',
      translation: '',
      examples: [],
      practicalTips: '',
      memoryZone: ''
    };
  }
  const rawText = data.rawText || data.raw || '';
  return {
    word: data.word || word,
    pos: data.pos || '',
    phonetic: data.phonetic || '',
    definition: data.definition || rawText || '',
    translation: data.translation || '',
    examples: Array.isArray(data.examples) ? data.examples : (data.example ? [data.example] : []),
    practicalTips: data.practicalTips || data.practical_tips || '',
    memoryZone: data.memoryZone || data.memory_zone || ''
  };
};

const normalizeMnemonic = (data) => {
  if (!data) {
    return { method: 'Etymology', content: '' };
  }
  if (typeof data === 'string') {
    return { method: 'Etymology', content: data.trim() };
  }
  if (typeof data.mnemonics === 'string') {
    return { method: 'Etymology', content: data.mnemonics.trim() };
  }
  const content = data.content
    || data.memoryZone
    || data.memoryZoneContent
    || data.memory_aid
    || data['memory aid']
    || '';
  const method = data.method || data.strategy || 'Etymology';
  const fallback = data.rawText || data.raw || '';
  return { method, content: (content || fallback || '').trim() };
};

const fetchDefinition = async ({ geminiKey, groqKey, word }) => {
  const response = await callAi({ geminiKey, groqKey, word, promptType: 'definition' });
  const raw = response?.data;
  const parsed = typeof raw === 'string' ? parseJsonContent(raw) : raw;
  return {
    data: normalizeDefinition(word, parsed),
    source: response?.source || 'AI'
  };
};

const fetchMnemonic = async ({ geminiKey, groqKey, word, definition }) => {
  const response = await callAi({
    geminiKey,
    groqKey,
    word,
    definition,
    promptType: 'mnemonic'
  });
  const raw = response?.data;
  const parsed = typeof raw === 'string' ? parseJsonContent(raw) : raw;
  return normalizeMnemonic(parsed);
};

export {
  AI_ERROR_CODES,
  fetchDefinition,
  fetchMnemonic
};
