const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

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
      model: GROQ_MODEL,
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
      }
      throw new Error("Gemini AI 失敗且未設定備用的 Groq API Key。");
    }
  } else if (groqKey) {
    console.log("未設定 Gemini Key，正在使用 Groq AI...");
    return await callGroq(groqKey, prompt);
  }
  throw new Error("請至少在設定頁面輸入一種 AI API Key (Gemini 或 Groq)。");
};

const generateDefinitionPrompt = (word) => `
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
Return ONLY a valid JSON object (no markdown formatting) with these exact keys:
{
  "word": "${word}",
  "pos": "part of speech (e.g., noun, verb)",
  "phonetic": "IPA phonetic symbol",
  "translation": "核心定義（可用繁體中文簡述）",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "practicalTips": "常見搭配或使用情境（繁中）",
  "memoryZone": "拆解字根/字首/字尾並以繁中解釋記憶法"
}`;

const generateMnemonicPrompt = (word, definition) => `
[Role] You are a professional, patient, and pedagogical English Tutor. Your goal is to help the user learn through simple and easy-to-understand explanations.
[Interaction Rules]
2. Vocabulary Mode (single word): strictly follow this response format:
   * Memory Zone: analyze the word using Roots, Prefixes, and Suffixes (Etymology) to explain its formation and aid memory.
[Tone] Encouraging, Clear, Structured.

Create a memory aid for the English word "${word}" (meaning: ${definition}).
Return ONLY a valid JSON object (no markdown) with this key:
{
  "mnemonics": "用繁體中文。請包含字根/字首/字尾拆解 + 連結記憶的有趣或合理聯想。"
}`;

const generateStoryPrompt = (words) => `
Write a short, engaging story (max 150 words) using ALL of the following English words: ${words.join(', ')}.
The story should be easy to read for an intermediate learner.
Highlight the target words by wrapping them in **double asterisks** (e.g., **apple**).
After the story, provide a brief Traditional Chinese summary.
`;

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
    const extracted = extractJsonObject(cleanJson);
    if (!extracted) throw error;
    const escaped = escapeNewlinesInStrings(extracted);
    return JSON.parse(escaped);
  }
};

const fetchDefinition = async ({ geminiKey, groqKey, word }) => {
  const { text, source } = await callAi(geminiKey, groqKey, generateDefinitionPrompt(word));
  return { data: parseJsonContent(text), source };
};

const normalizeMnemonic = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data.mnemonics === 'string') return data.mnemonics.trim();
  const etymology = data.etymology || data.etymologyNotes;
  const memory = data.memoryZone || data.memoryAid || data.memory_aid || data['memory aid'];
  const parts = [];
  if (etymology) parts.push(`字源拆解: ${etymology}`);
  if (memory) parts.push(`記憶法: ${memory}`);
  if (parts.length > 0) return parts.join('\n');
  try {
    return JSON.stringify(data);
  } catch (error) {
    return String(data);
  }
};

const fetchMnemonic = async ({ geminiKey, groqKey, word, definition }) => {
  const { text } = await callAi(geminiKey, groqKey, generateMnemonicPrompt(word, definition));
  const parsed = parseJsonContent(text);
  return normalizeMnemonic(parsed);
};

const fetchStory = async ({ geminiKey, groqKey, words }) => {
  const { text } = await callAi(geminiKey, groqKey, generateStoryPrompt(words));
  return text;
};

export {
  GEMINI_MODEL,
  GEMINI_API_URL,
  GROQ_API_URL,
  fetchDefinition,
  fetchMnemonic,
  fetchStory
};
