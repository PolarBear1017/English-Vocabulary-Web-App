import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRelatedWords } from './dictionaryService';

describe('fetchRelatedWords', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty structure for invalid input', async () => {
    const result = await fetchRelatedWords('');
    expect(result).toEqual({
      wordFamily: { noun: [], verb: [], adjective: [], adverb: [] },
      synonyms: []
    });
  });

  it('correctly maps derivations into parts of speech and extracts synonyms', async () => {
    const mockDerivations = [
      { word: 'creation', tags: ['n'], score: 5000 },
      { word: 'creator', tags: ['n'], score: 4000 },
      { word: 'creative', tags: ['adj'], score: 3000 },
      { word: 'creatively', tags: ['adv'], score: 2000 }
    ];
    const mockSynonyms = [
      { word: 'generate' },
      { word: 'produce' },
      { word: 'invent' }
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('sp=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDerivations)
        });
      }
      if (urlStr.includes('rel_syn')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSynonyms)
        });
      }
      return Promise.resolve({ ok: false });
    });

    const result = await fetchRelatedWords('create');
    expect(result.wordFamily.noun).toEqual(['creation', 'creator']);
    expect(result.wordFamily.adjective).toEqual(['creative']);
    expect(result.wordFamily.adverb).toEqual(['creatively']);
    expect(result.synonyms).toEqual(['generate', 'produce', 'invent']);
  });

  it('fetches real live word family and synonyms for produce', async () => {
    vi.restoreAllMocks();
    const result = await fetchRelatedWords('produce');
    expect(result).toBeDefined();
    expect(result.wordFamily.noun.length).toBeGreaterThan(0);
    expect(result.wordFamily.adjective.length).toBeGreaterThan(0);
    expect(result.synonyms.length).toBeGreaterThan(0);
  });
});
