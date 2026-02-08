import * as cheerio from 'cheerio';

const scrapeCambridge = async (word) => {
  const targetUrl = `https://dictionary.cambridge.org/dictionary/english-chinese-traditional/${encodeURIComponent(word)}`;
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7'
    }
  });

  if (!response.ok) return null;

  const html = await response.text();
  const $ = cheerio.load(html);

  const isFound = $('.di-title').length > 0 || $('.def-block').length > 0;
  if (!isFound) return null;

  const pos = $('.pos').first().text() || 'unknown';
  const phonetic = $('.us .ipa').first().text() || $('.ipa').first().text() || '';

  const entries = [];
  $('.def-block').each((_, block) => {
    const definitionText = $(block).find('.def').first().text().replace(':', '').trim();
    const translationText = $(block).find('.trans').first().text().trim();
    const examples = $(block)
      .find('.examp')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    if (definitionText) {
      entries.push({
        definition: definitionText,
        translation: translationText,
        example: examples[0] || '',
        examples
      });
    }
  });

  if (entries.length === 0) {
    const definition = $('.def').first().text().replace(':', '').trim();
    const translation = $('.trans').first().text().trim();
    const example = $('.examp').first().text().trim();

    if (definition) {
      entries.push({
        definition,
        translation,
        example,
        examples: example ? [example] : []
      });
    }
  }

  const usAudioSource = $('.us.dpron-i source[type="audio/mpeg"]').first();
  const ukAudioSource = $('.uk.dpron-i source[type="audio/mpeg"]').first();
  const usAudioUrl = usAudioSource.attr('src')
    ? 'https://dictionary.cambridge.org' + usAudioSource.attr('src')
    : '';
  const ukAudioUrl = ukAudioSource.attr('src')
    ? 'https://dictionary.cambridge.org' + ukAudioSource.attr('src')
    : '';

  if (entries.length === 0) return null;

  return {
    word,
    pos,
    phonetic: phonetic ? `/${phonetic}/` : '',
    definition: entries[0].definition,
    translation: entries[0].translation,
    example: entries[0].example,
    entries,
    audioUrl: usAudioUrl || ukAudioUrl,
    usAudioUrl,
    ukAudioUrl,
    source: 'Cambridge'
  };
};

// Scrape Yahoo Dictionary (Taiwan)
const scrapeYahoo = async (word) => {
  try {
    // Use the dictionary subdomain which has a cleaner layout and doesn't treat "apple" as a company
    const url = `https://tw.dictionary.search.yahoo.com/search?p=${encodeURIComponent(word)}`;

    // Use a standard browser User-Agent
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('Yahoo scraper error:', response.status, response.statusText);
      return {
        source: 'Yahoo',
        word,
        entries: []
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const entries = [];
    const seenDefinitions = new Set();

    // Target the main dictionary card
    // Specific class found: .dictionaryWordCard
    const dictionaryCard = $('.dictionaryWordCard').first();

    if (dictionaryCard.length > 0) {
      // Extract simple definitions from the compList
      const listItems = dictionaryCard.find('.compList > ul > li');

      listItems.each((i, el) => {
        const $el = $(el);

        // Extract POS from .pos_button
        const pos = $el.find('.pos_button').text().trim();

        // Extract definition from .dictionaryExplanation
        const defText = $el.find('.dictionaryExplanation').text().trim();

        if (defText) {
          // Split by semicolon for separate meanings if desired, 
          // but for now keeping it as one string per POS often matches user expectation for a summary.
          const meanings = defText.split(';').map(s => s.trim()).filter(Boolean);

          meanings.forEach(meaning => {
            // Create a unique key to prevent exact duplicates
            const uniqueKey = `${pos}-${meaning}`;

            if (!seenDefinitions.has(uniqueKey)) {
              seenDefinitions.add(uniqueKey);
              entries.push({
                definition: meaning,
                translation: '', // Frontend displays both definition and translation, avoid duplication since definition is already Chinese
                example: '',
                examples: [],
                pos: pos || 'unknown'
              });
            }
          });
        }
      });
    }

    // Fallback: generic .dd.card if specific structure fails
    if (entries.length === 0) {
      const fallbackCard = $('.dd.card').first();
      if (fallbackCard.length > 0) {
        fallbackCard.find('.compList > ul > li').each((i, el) => {
          const text = $(el).text().trim();
          const spaceIdx = text.indexOf(' ');
          if (spaceIdx > 0) {
            const pos = text.substring(0, spaceIdx).trim();
            const def = text.substring(spaceIdx).trim();
            if (pos && def && !seenDefinitions.has(def)) {
              seenDefinitions.add(def);
              entries.push({
                definition: def,
                translation: '', // Avoid duplication
                example: '',
                examples: [],
                pos: pos
              });
            }
          }
        });
      }
    }



    return {
      word,
      pos: entries.length > 0 ? entries[0].pos : 'unknown',
      phonetic: '',
      definition: entries.length > 0 ? entries[0].definition : '',
      translation: '', // Top level translation also empty
      example: '',
      entries,
      audioUrl: '',
      usAudioUrl: '',
      ukAudioUrl: '',
      source: 'Yahoo'
    };
  } catch (error) {
    console.warn("Yahoo scraping failed", error);
    return {
      source: 'Yahoo',
      word,
      entries: []
    };
  }
};




// Scrape Google Translate (unofficial JSON API for rich results)
const scrapeGoogleTranslate = async (word) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&dt=bd&q=${encodeURIComponent(word)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Google Translate API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    // data[0][0][0] contains the primary translation
    const primaryTranslation = data[0]?.[0]?.[0];

    if (!primaryTranslation) {
      return null;
    }

    const entries = [];
    const seenDefinitions = new Set();

    // data[1] contains distinct parts of speech and their translations
    // Structure: [ [ "noun", [ "銀行", "岸", ... ], [ [ "銀行", [ "bank" ] ], ... ], ... ], [ "verb", ... ] ]
    const extraDefinitions = data[1];

    if (Array.isArray(extraDefinitions)) {
      extraDefinitions.forEach(posBlock => {
        const pos = posBlock[0]; // e.g. "noun"
        const terms = posBlock[1]; // e.g. ["銀行", "岸", ...]

        if (Array.isArray(terms)) {
          terms.forEach(term => {
            if (!seenDefinitions.has(term)) {
              seenDefinitions.add(term);
              entries.push({
                definition: term,
                translation: '', // definition is in Chinese already
                example: '',
                examples: [],
                pos: pos
              });
            }
          });
        }
      });
    }

    // Fallback: if no dictionary entries found (e.g. simple phrase), use primary translation
    if (entries.length === 0) {
      entries.push({
        definition: primaryTranslation,
        translation: '',
        example: '',
        examples: [],
        pos: 'unknown'
      });
    }

    return {
      word,
      pos: entries.length > 0 ? entries[0].pos : 'unknown',
      phonetic: '',
      definition: primaryTranslation,
      translation: '',
      example: '',
      entries: entries,
      audioUrl: '',
      usAudioUrl: '',
      ukAudioUrl: '',
      source: 'Google Translate'
    };

  } catch (error) {
    console.warn("Google Translate API failed", error);
    return null;
  }
};


// Helper to detect Chinese characters
const isChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

// Translate Chinese to English using Google Translate API
const translateToEnglish = async (text) => {
  try {
    // sl=zh-TW (source), tl=en (target)
    // dt=t (translation), dt=bd (dictionary/alternatives)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=en&dt=t&dt=bd&q=${encodeURIComponent(text)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    // data[0][0][0] is the primary translated text
    const primary = data[0]?.[0]?.[0];

    if (!primary) return null;

    // data[1] contains dictionary entries/alternatives
    // Structure: [ [ "noun", [ "apple", ... ], ... ] ]
    const alternatives = [];
    if (data[1] && Array.isArray(data[1])) {
      data[1].forEach(block => {
        if (Array.isArray(block[1])) {
          block[1].forEach(word => {
            if (word && word.toLowerCase() !== primary.toLowerCase()) {
              alternatives.push(word);
            }
          });
        }
      });
    }

    // Filter unique and limit
    const uniqueAlternatives = [...new Set(alternatives)].slice(0, 8); // Limit to 8 suggestions

    return {
      word: primary,
      alternatives: uniqueAlternatives
    };

  } catch (error) {
    console.warn("Translation failed", error);
    return null;
  }
};

export default async function handler(req, res) {
  // 處理 CORS (允許你的前端存取)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  /* 
    Updated to support multiple sources.
    Default: Cambridge
    Options: Cambridge, Yahoo
  */
  const { word, source = 'Cambridge' } = req.query;

  if (!word) {
    return res.status(400).json({ error: 'Word parameter is required' });
  }

  try {
    let searchWord = word;
    let originalQuery = null;
    let alternatives = [];

    // Smart Translation Logic: If input is Chinese, translate to English first
    if (isChinese(word)) {
      const result = await translateToEnglish(word);
      if (result && result.word) {
        originalQuery = word;
        searchWord = result.word;
        alternatives = result.alternatives || [];
      }
    }

    let result = null;

    if (source === 'Yahoo') {
      result = await scrapeYahoo(searchWord);
    } else if (source === 'Google Translate') {
      result = await scrapeGoogleTranslate(searchWord);
    } else {
      // Default to Cambridge
      result = await scrapeCambridge(searchWord);
    }

    if (!result) {
      // If translated search failed, maybe try Google Translate directly on the original Chinese word?
      // But usually looking up "Apple" in Cambridge is what we want.
      return res.status(404).json({ error: `Word not found in ${source} Dictionary`, searchedWord: searchWord });
    }

    // Attach original query info if translation happened
    if (originalQuery) {
      result.originalQuery = originalQuery;
      result.translatedFrom = originalQuery;
      result.alternatives = alternatives;
    }

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
