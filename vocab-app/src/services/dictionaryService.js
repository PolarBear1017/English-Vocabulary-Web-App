import { supabase } from '../supabase';

const fetchDictionaryEntry = async (word, source = 'Cambridge') => {
  const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}&source=${encodeURIComponent(source)}`);
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

  const supabasePrefixMatches = supabaseResults.filter(
    (item) => item.match_type === 'exact' || item.match_type === 'prefix'
  ).length;

  let datamuseResults = [];
  if (supabaseResults.length < limit || supabasePrefixMatches < 2) {
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

  const normalizedQuery = query.trim().toLowerCase();
  const normalizeItem = (item, fallbackMatchType = null) => {
    const word = typeof item === 'string' ? item : item.word;
    if (!word) return null;
    return {
      word,
      matchType: item?.match_type ?? item?.matchType ?? fallbackMatchType,
      score: item?.score ?? null
    };
  };

  const seen = new Set();
  const merged = [];
  const appendUnique = (items, fallbackMatchType = null) => {
    items.forEach((item) => {
      const normalized = normalizeItem(item, fallbackMatchType);
      if (!normalized) return;
      const key = normalized.word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(normalized);
    });
  };

  appendUnique(supabaseResults);
  appendUnique(datamuseResults, 'prefix');

  const prefixCount = merged.filter((item) => item.word.toLowerCase().startsWith(normalizedQuery)).length;
  const filtered = prefixCount >= 2
    ? merged.filter((item) => item.matchType !== 'fuzzy')
    : merged;

  const rankItem = (item) => {
    const lowerWord = item.word.toLowerCase();
    if (lowerWord === normalizedQuery) return { tier: 0, length: lowerWord.length, score: item.score ?? 0 };
    if (lowerWord.startsWith(normalizedQuery)) return { tier: 1, length: lowerWord.length, score: item.score ?? 0 };
    return { tier: 2, length: lowerWord.length, score: item.score ?? 0 };
  };

  const sorted = [...filtered].sort((a, b) => {
    const ra = rankItem(a);
    const rb = rankItem(b);
    if (ra.tier !== rb.tier) return ra.tier - rb.tier;
    if (ra.tier === 1 && ra.length !== rb.length) return ra.length - rb.length;
    if (rb.score !== ra.score) return rb.score - ra.score;
    return a.word.localeCompare(b.word);
  });

  return sorted.slice(0, limit);
};

export { fetchDictionaryEntry, fetchSuggestions };
