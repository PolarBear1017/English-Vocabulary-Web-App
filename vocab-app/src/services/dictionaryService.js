import { supabase } from '../supabase';

const fetchDictionaryEntry = async (word) => {
  const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
  if (!res.ok) return null;
  return res.json();
};

const fetchSuggestions = async (query, options = {}) => {
  if (!query.trim() || query.length < 2) return [];
  const { signal } = options;
  const limit = 5;
  let supabaseResults = [];

  try {
    const { data, error } = await supabase
      .rpc('suggest_words', { query_text: query, max_results: limit })
      .abortSignal(signal);

    if (error) throw error;

    if (data && data.length > 0) {
      supabaseResults = data;
    }
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) return [];
    console.warn('Suggestion fetch failed (supabase)', error);
  }

  let datamuseResults = [];
  if (supabaseResults.length < limit) {
    try {
      const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}`, { signal });
      if (res.ok) {
        const extData = await res.json();
        datamuseResults = extData;
      }
    } catch (error) {
      if (error.name === 'AbortError' || signal?.aborted) return [];
      console.warn('Suggestion fetch failed (datamuse)', error);
    }
  }

  const seen = new Set();
  const merged = [];
  const appendUnique = (items) => {
    items.forEach((item) => {
      const word = typeof item === 'string' ? item : item.word;
      if (!word) return;
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
  };

  appendUnique(supabaseResults);
  appendUnique(datamuseResults);

  return merged.slice(0, limit);
};

export { fetchDictionaryEntry, fetchSuggestions };
