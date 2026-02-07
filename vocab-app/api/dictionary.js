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

const scrapeYahoo = async (word) => {
  // Use the search page instead of dictionary page to avoid redirects/blocks
  const targetUrl = `https://tw.search.yahoo.com/search?p=${encodeURIComponent(word)}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const entries = [];
    const seenDefinitions = new Set();
    let pos = 'unknown';
    let phonetic = '';

    // Strategy 1: Look for the specific dictionary card in search results
    // Yahoo Search often embeds a dictionary card with class .dd.card or similar
    const dictionaryCard = $('.dd.card').first();

    if (dictionaryCard.length > 0) {
      // Extract from card
      pos = dictionaryCard.find('.pos').first().text().trim() || pos;
      phonetic = dictionaryCard.find('.ipa').first().text().replace(/^\[|\]$/g, '').trim() || phonetic;

      dictionaryCard.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text && !seenDefinitions.has(text)) {
          // Formatting: "n. definition"
          const parts = text.split('.');
          const currentPos = parts.length > 1 ? parts[0] + '.' : pos;
          const def = parts.length > 1 ? parts.slice(1).join('.').trim() : text;

          seenDefinitions.add(text);
          entries.push({
            definition: def,
            translation: def,
            example: '',
            examples: [],
            pos: currentPos
          });
        }
      });
    }

    // Strategy 2: Look for the dictionary result link and snippet
    // The dictionary result usually has title "Word - Yahoo奇摩字典"
    if (entries.length === 0) {
      $('li .title a').each((_, el) => {
        const title = $(el).text().trim();
        if (title.includes('Yahoo奇摩字典') && title.toLowerCase().includes(word.toLowerCase())) {
          const snippet = $(el).closest('li').find('.compText').text().trim() ||
            $(el).closest('li').find('.abstract').text().trim();

          if (snippet) {
            // Extract definitions from snippet: "KK[tɛst]; DJ[test] ... n. 1. 測試, 2. 試驗..."
            // Removing IPA
            let cleanSnippet = snippet.replace(/KK\[.*?\]/, '').replace(/DJ\[.*?\]/, '').trim();

            // Split by part of speech if possible or just take the whole string
            const defs = cleanSnippet.split(';').map(s => s.trim()).filter(s => s);

            defs.forEach(def => {
              if (!seenDefinitions.has(def)) {
                seenDefinitions.add(def);
                entries.push({
                  definition: def,
                  translation: def,
                  example: '',
                  examples: [],
                  pos: 'unknown'
                });
              }
            });
          }
        }
      });
    }

    // Strategy 3: Previous strategy with .compList (if main search page mimics dictionary layout)
    if (entries.length === 0) {
      $('.compList ul li').each((_, li) => {
        const text = $(li).find('.explanation').text().trim();
        if (text && !seenDefinitions.has(text)) {
          seenDefinitions.add(text);
          entries.push({
            definition: text,
            translation: text,
            example: '',
            examples: [],
            pos: $(li).find('.pos_button').text().trim() || 'unknown'
          });
        }
      });
    }

    if (entries.length === 0) return null;

    return {
      word,
      pos,
      phonetic: phonetic ? `/${phonetic}/` : '',
      definition: entries[0].definition,
      translation: entries[0].translation,
      example: entries[0].example,
      entries,
      audioUrl: '',
      usAudioUrl: '',
      ukAudioUrl: '',
      source: 'Yahoo'
    };

  } catch (error) {
    console.warn("Yahoo scraping failed", error);
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
    let result = null;

    if (source === 'Yahoo') {
      result = await scrapeYahoo(word);
    } else {
      // Default to Cambridge
      result = await scrapeCambridge(word);
    }

    if (!result) {
      return res.status(404).json({ error: `Word not found in ${source} Dictionary` });
    }

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
