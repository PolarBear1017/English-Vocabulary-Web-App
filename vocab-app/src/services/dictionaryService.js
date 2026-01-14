import { supabase } from '../supabase';

const fetchDictionaryEntry = async (word) => {
  const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
  if (!res.ok) return null;
  return res.json();
};

const fetchSuggestions = async (query) => {
  if (!query.trim() || query.length < 2) return [];

  try {
    const { data } = await supabase
      .from('dictionary')
      .select('word')
      .ilike('word', `${query}%`)
      .limit(5);

    if (data && data.length > 0) {
      return data;
    }
  } catch (error) {
    console.warn('Suggestion fetch failed (supabase)', error);
  }

  try {
    const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const extData = await res.json();
    return extData.slice(0, 5);
  } catch (error) {
    console.warn('Suggestion fetch failed (datamuse)', error);
  }

  return [];
};

export { fetchDictionaryEntry, fetchSuggestions };
