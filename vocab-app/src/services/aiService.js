const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
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

const generateMnemonicPrompt = (word, definition) => `
Create a memory aid for the English word "${word}" (meaning: ${definition}).
Return ONLY a valid JSON object (no markdown) with this key:
{
  "mnemonics": "A creative memory aid. 1. Break down roots/prefixes/suffixes if applicable. 2. Provide a funny or logical association (mnemonic) in Traditional Chinese."
}`;

const generateStoryPrompt = (words) => `
Write a short, engaging story (max 150 words) using ALL of the following English words: ${words.join(', ')}.
The story should be easy to read for an intermediate learner.
Highlight the target words by wrapping them in **double asterisks** (e.g., **apple**).
After the story, provide a brief Traditional Chinese summary.
`;

const parseJsonContent = (text) => {
  const cleanJson = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleanJson);
};

const fetchDefinition = async ({ geminiKey, groqKey, word }) => {
  const { text, source } = await callAi(geminiKey, groqKey, generateDefinitionPrompt(word));
  return { data: parseJsonContent(text), source };
};

const fetchMnemonic = async ({ geminiKey, groqKey, word, definition }) => {
  const { text } = await callAi(geminiKey, groqKey, generateMnemonicPrompt(word, definition));
  return parseJsonContent(text);
};

const fetchStory = async ({ geminiKey, groqKey, words }) => {
  const { text } = await callAi(geminiKey, groqKey, generateStoryPrompt(words));
  return text;
};

export {
  GEMINI_API_URL,
  GROQ_API_URL,
  fetchDefinition,
  fetchMnemonic,
  fetchStory
};
