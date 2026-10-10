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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.datamuse.com/words?sp=produce*&md=p&max=5', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
    } catch {
      // Offline / network restricted environment, mock response to verify parse logic
      vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('sp=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { word: 'product', tags: ['n'], score: 5000 },
              { word: 'productive', tags: ['adj'], score: 4000 }
            ])
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ word: 'make' }])
        });
      });
    }

    const result = await fetchRelatedWords('produce');
    expect(result).toBeDefined();
    expect(result.wordFamily.noun.length).toBeGreaterThan(0);
    expect(result.wordFamily.adjective.length).toBeGreaterThan(0);
    expect(result.synonyms.length).toBeGreaterThan(0);
  });

  it('correctly derives convenient and conveniently from convenience', async () => {
    const mockItems = [
      { word: 'convenient', tags: ['adj'], score: 14000 },
      { word: 'conveniently', tags: ['adv'], score: 6000 },
      { word: 'convenience', tags: ['n'], score: 5000 },
      { word: 'conveniency', tags: ['n'], score: 2000 }
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('sp=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockItems)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    const result = await fetchRelatedWords('convenience');
    expect(result.wordFamily.adjective).toContain('convenient');
    expect(result.wordFamily.adverb).toContain('conveniently');
    expect(result.wordFamily.noun).toContain('convenience');
  });
});
