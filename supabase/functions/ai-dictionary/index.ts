/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

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

const buildDefinitionPrompt = (word: string) => `
[Role] You are a professional, patient, and pedagogical English Tutor. Your goal is to help the user learn through simple and easy-to-understand explanations.
[Interaction Rules]
1. General Inquiries: When the user asks about English concepts, guide them using plain language.
2. Vocabulary Mode: When the user inputs a single "English word" or "Chinese term," strictly follow this response format:
   * Translation: Provide the core definition.
   * Examples: Provide 1-2 contextual sentences.
   * Practical Tips: Include collocations or common usage nuances.
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
  "translation": "核心定義（可用繁體中文簡述）",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "practicalTips": "常見搭配或使用情境（繁中）",
  "memoryZone": "拆解字根/字首/字尾並以繁中解釋記憶法"
}`;

const buildMnemonicPrompt = (word: string, definition: string) => `
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
  "method": "方法名稱 (例如: Etymology)",
  "content": "用繁體中文。請包含字根/字首/字尾拆解 + 連結記憶的有趣或合理聯想。"
}`;

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

const callGemini = async (apiKey: string, prompt: string) => {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API 呼叫失敗: ${errorData.error?.message}`);
  }

  const data = await response.json();
  return { text: data.candidates[0].content.parts[0].text, source: 'Gemini AI', model: GEMINI_MODEL };
};

const callGroq = async (apiKey: string, prompt: string) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq API 呼叫失敗: ${errorData.error?.message}`);
  }

  const data = await response.json();
  return { text: data.choices[0].message.content, source: 'Groq AI', model: GROQ_MODEL };
};

const callAi = async (geminiKey: string | undefined, groqKey: string | undefined, prompt: string) => {
  if (geminiKey) {
    try {
      return await callGemini(geminiKey, prompt);
    } catch (error) {
      if (groqKey) {
        return await callGroq(groqKey, prompt);
      }
      throw error;
    }
  }
  if (groqKey) {
    return await callGroq(groqKey, prompt);
  }
  const error = new Error('請至少在設定頁面輸入一種 AI API Key (Gemini 或 Groq)。');
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

    const body = await req.json();
    const word = String(body?.word || '').trim().toLowerCase();
    const promptType = String(body?.promptType || '').trim();
    const definition = String(body?.definition || '').trim();
    const apiKeys = body?.apiKeys || {};

    if (!word || !promptType) {
      return new Response(JSON.stringify({ error: 'Missing word or promptType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    const prompt = promptType === 'mnemonic'
      ? buildMnemonicPrompt(word, definition)
      : buildDefinitionPrompt(word);

    const { text, source, model } = await callAi(apiKeys.geminiKey, apiKeys.groqKey, prompt);
    const parsed = parseJsonContent(text);

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
