/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { hasAuthenticatedUser } from "./auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';

let cachedModels: string[] = [];
let cacheExpiry = 0;

const getAvailableGroqModels = async (apiKey: string): Promise<string[]> => {
  const now = Date.now();
  if (cachedModels.length > 0 && now < cacheExpiry) {
    return cachedModels;
  }

  try {
    const res = await fetch(GROQ_MODELS_URL, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (res.ok) {
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const unusableKeywords = [
        'whisper', 'tts', 'guard', 'safeguard', 'orpheus', 'distil', 'vision', 'compound', 'tool-use-preview'
      ];

      const validModels = data
        .map((m: any) => String(m.id || '').trim())
        .filter((id: string) => {
          if (!id) return false;
          const lower = id.toLowerCase();
          return !unusableKeywords.some(keyword => lower.includes(keyword));
        });

      if (validModels.length > 0) {
        const score = (name: string) => {
          const n = name.toLowerCase();
          if (n.includes('gpt-oss-120b')) return 100;
          if (n.includes('gpt-oss-20b')) return 95;
          if (n.includes('qwen3.8')) return 90;
          if (n.includes('qwen3')) return 85;
          if (n.includes('qwen')) return 80;
          if (n.includes('120b') || n.includes('70b')) return 70;
          if (n.includes('instruct') || n.includes('chat') || n.includes('versatile')) return 60;
          return 10;
        };

        const sorted = validModels.sort((a, b) => score(b) - score(a));
        cachedModels = sorted;
        cacheExpiry = now + 1000 * 60 * 30; // Cache for 30 minutes
        console.log('Dynamically discovered Groq models:', cachedModels);
        return cachedModels;
      }
    }
  } catch (err) {
    console.warn('Failed to dynamically query Groq models:', err);
  }

  return [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b'
  ];
};

const AI_ERROR_CODES = {
  MISSING_API_KEYS: 'MISSING_API_KEYS'
};

const ensureEnv = () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return { url, key };
};

const buildDefinitionPrompt = (word: string, targetLang = 'zh-TW') => {
  const isEn = targetLang === 'en';
  return `
[Role] You are a professional, patient, and pedagogical English Tutor. Your goal is to help the user learn through simple and easy-to-understand explanations.
[Interaction Rules]
1. General Inquiries: When the user asks about English concepts, guide them using plain language.
2. Vocabulary Mode: When the user inputs a single "English word" or "Chinese term," strictly follow this response format:
   * Translation: ${isEn ? 'Provide the core definition in concise English (English-English dictionary style).' : 'Provide the core definition in Traditional Chinese.'}
   * Examples: Provide 1-2 contextual sentences.
   * Practical Tips: ${isEn ? 'Include collocations or common usage nuances in English.' : '常見搭配或使用情境（繁中）。'}
   * Memory Zone: This is crucial. You must analyze the word using Roots, Prefixes, and Suffixes (Etymology) to explain its formation and aid memory.
[Tone] Encouraging, Clear, Structured.

The user input is a single word: "${word}".
Return ONLY a valid JSON object (no markdown formatting) with these exact keys.
IMPORTANT: Output must be valid JSON. Do NOT include any unescaped double quotes inside string values.
If you need quotation marks, use fullwidth brackets like 「」 or 『』 instead of ".
{
  "word": "${word}",
  "pos": "part of speech (e.g., noun, verb)",
  "phonetic": "IPA phonetic symbol",
  "translation": "${isEn ? 'Core concise English definition' : '核心定義（可用繁體中文簡述）'}",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "practicalTips": "${isEn ? 'Common collocations or nuance tips in English' : '常見搭配或使用情境（繁中）'}",
  "memoryZone": {
    "prefix": "${isEn ? 'prefix or empty (format: prefix-)' : '字首或無 (格式: prefix-)'}",
    "prefixMeaning": "${isEn ? 'meaning of prefix' : '字首意思'}",
    "root": "${isEn ? 'root' : '字根'}",
    "rootMeaning": "${isEn ? 'meaning of root' : '字根意思'}",
    "suffix": "${isEn ? 'suffix or empty (format: -suffix)' : '字尾或無 (格式: -suffix)'}",
    "suffixMeaning": "${isEn ? 'meaning of suffix' : '字尾意思'}",
    "story": "${isEn ? 'Break down prefix/root/suffix and explain mnemonic story in English' : '拆解字根/字首/字尾並以繁中解釋記憶法'}"
  }
}`;
};

const buildMnemonicPrompt = (word: string, definition: string, targetLang = 'zh-TW') => {
  const isEn = targetLang === 'en';
  return `
[Role] You are a professional, patient, and pedagogical English Tutor. Your goal is to help the user learn through simple and easy-to-understand explanations.
[Interaction Rules]
2. Vocabulary Mode (single word): strictly follow this response format:
   * Memory Zone: analyze the word using Roots, Prefixes, and Suffixes (Etymology) to explain its formation and aid memory.
[Tone] Encouraging, Clear, Structured.

Create a memory aid for the English word "${word}" (meaning: ${definition}).
Return ONLY a valid JSON object (no markdown) with this key.
IMPORTANT: Output must be valid JSON. Do NOT include any unescaped double quotes inside string values.
If you need quotation marks, use fullwidth brackets like 「」 or 『』 instead of ".
{
  "method": "${isEn ? 'Etymology & Association' : '字根字首記憶法'}",
  "prefix": "${isEn ? 'prefix or empty' : '字首或無'}",
  "prefixMeaning": "${isEn ? 'meaning of prefix' : '字首意思'}",
  "root": "${isEn ? 'root' : '字根'}",
  "rootMeaning": "${isEn ? 'meaning of root' : '字根意思'}",
  "suffix": "${isEn ? 'suffix or empty' : '字尾或無'}",
  "suffixMeaning": "${isEn ? 'meaning of suffix' : '字尾意思'}",
  "content": "${isEn ? 'Engaging and intuitive mnemonic story in English (required)' : '連結記憶的有趣或合理聯想故事（必填）'}"
}`;
};

const buildStoryPrompt = (words: string[], targetLang = 'zh-TW') => {
  const isEn = targetLang === 'en';
  return `
Write a short, engaging story (max 150 words) using ALL of the following English words: ${words.join(', ')}.
The story should be easy to read for an intermediate learner.
Highlight the target words by wrapping them in **double asterisks** (e.g., **apple**).
${isEn ? 'After the story, provide a brief English summary.' : 'After the story, provide a brief Traditional Chinese summary.'}
`;
};

const escapeNewlinesInStrings = (input: string) => {
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

const normalizeJsonText = (input: string) => {
  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return input;
  let body = input.slice(start, end + 1);
  body = body.replace(/\\"/g, '「').replace(/\\'/g, '『');
  body = body.replace(/'/g, '『');
  return body;
};

const escapeUnescapedQuotesInStrings = (input: string) => {
  let inString = false;
  let escaped = false;
  let result = '';
  const length = input.length;
  for (let i = 0; i < length; i += 1) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }
    if (ch === '\\\\') {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '\"') {
      if (!inString) {
        inString = true;
        result += ch;
        continue;
      }
      let j = i + 1;
      while (j < length && /\s/.test(input[j])) j += 1;
      const next = j < length ? input[j] : '';
      if (next === ',' || next === '}' || next === ']' || next === '') {
        inString = false;
        result += ch;
      } else {
        result += '\\\"';
      }
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

const extractJsonObject = (text: string) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return '';
  return text.slice(start, end + 1);
};

const parseJsonContent = (text: string) => {
  const cleanJson = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    try {
      const normalized = normalizeJsonText(cleanJson);
      const extracted = extractJsonObject(normalized);
      if (!extracted) {
        return { rawText: cleanJson, parseError: (error as Error).message };
      }
      const escapedQuotes = escapeUnescapedQuotesInStrings(extracted);
      const escaped = escapeNewlinesInStrings(escapedQuotes);
      return JSON.parse(escaped);
    } catch (secondError) {
      return { rawText: cleanJson, parseError: (secondError as Error).message };
    }
  }
};

const callGroq = async (apiKey: string, prompt: string) => {
  const modelsToTry = await getAvailableGroqModels(apiKey);
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const data = await response.json();
      return { text: data.choices[0].message.content, source: 'Groq AI', model };
    } catch (err) {
      console.warn(`Model ${model} failed:`, err);
      lastError = err as Error;
      if (
        lastError.message?.includes('does not exist') ||
        lastError.message?.includes('access') ||
        lastError.message?.includes('decommissioned') ||
        lastError.message?.includes('deprecated')
      ) {
        cachedModels = cachedModels.filter(m => m !== model);
        continue;
      }
      throw new Error(`Groq API 呼叫失敗: ${lastError.message}`);
    }
  }
  throw new Error(`Groq API 呼叫失敗: ${lastError?.message || '無可用的 Groq 模型'}`);
};

const callAi = async (groqKey: string | undefined, prompt: string) => {
  if (groqKey) return await callGroq(groqKey, prompt);
  const error = new Error('請在設定頁面輸入 Groq API Key。');
  (error as Error & { code?: string }).code = AI_ERROR_CODES.MISSING_API_KEYS;
  throw error;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, key } = ensureEnv();
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    });

    if (!(await hasAuthenticatedUser(req, supabase))) {
      return new Response(JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const word = String(body?.word || '').trim().toLowerCase();
    const promptType = String(body?.promptType || '').trim();
    const definition = String(body?.definition || '').trim();
    const words = Array.isArray(body?.words) ? body.words.filter(Boolean) : [];
    const apiKeys = body?.apiKeys || {};
    const targetLang = String(body?.targetLang || 'zh-TW').trim();

    if ((!word && promptType !== 'story') || !promptType) {
      return new Response(JSON.stringify({ error: 'Missing word or promptType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (promptType !== 'story' && targetLang === 'zh-TW') {
      const { data: cached, error: cacheError } = await supabase
        .from('word_ai_cache')
        .select('content, source, model')
        .eq('word', word)
        .eq('prompt_type', promptType)
        .maybeSingle();

      if (!cacheError && cached?.content) {
        return new Response(JSON.stringify({
          data: cached.content,
          source: cached.source || 'AI',
          model: cached.model || null,
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const prompt = promptType === 'mnemonic'
      ? buildMnemonicPrompt(word, definition, targetLang)
      : (promptType === 'story'
        ? buildStoryPrompt(words, targetLang)
        : buildDefinitionPrompt(word, targetLang));

    const { text, source, model } = await callAi(apiKeys.groqKey, prompt);
    const parsed = promptType === 'story' ? text : parseJsonContent(text);

    if (promptType !== 'story' && targetLang === 'zh-TW') {
      const { error: upsertError } = await supabase
        .from('word_ai_cache')
        .upsert({
          word,
          prompt_type: promptType,
          content: parsed,
          source,
          model,
          updated_at: new Date().toISOString()
        }, { onConflict: 'word,prompt_type' });

      if (upsertError) {
        console.warn('Cache upsert failed', upsertError);
      }
    }

    return new Response(JSON.stringify({ data: parsed, source, model, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = (error as { code?: string })?.code;
    return new Response(JSON.stringify({ error: message, code }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
