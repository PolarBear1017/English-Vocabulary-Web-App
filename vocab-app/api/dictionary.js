import * as cheerio from 'cheerio';

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

  const { word } = req.query;

  if (!word) {
    return res.status(400).json({ error: 'Word parameter is required' });
  }

  try {
    const targetUrl = `https://dictionary.cambridge.org/dictionary/english-chinese-traditional/${encodeURIComponent(word)}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Word not found in Cambridge Dictionary' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 檢查是否真的有抓到內容 (有時候會轉址到首頁)
    const isFound = $('.di-title').length > 0 || $('.def-block').length > 0;
    if (!isFound) {
       return res.status(404).json({ error: 'Definition not found' });
    }

    // 1. 抓取詞性 (嘗試多種選擇器)
    const pos = $('.pos').first().text() || 'unknown';
    
    // 2. 抓取音標 (優先抓美式)
    const phonetic = $('.us .ipa').first().text() || $('.ipa').first().text() || '';

    // 3. 抓取所有定義與例句 (同一單字可能有多個 def-block)
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

    // 如果連定義都沒抓到，視為失敗，回傳 404 讓前端切換成 AI
    if (entries.length === 0) {
      return res.status(404).json({ error: 'Definition parsing failed' });
    }

    const primaryEntry = entries[0];

    return res.status(200).json({
      word,
      pos,
      phonetic: phonetic ? `/${phonetic}/` : '',
      definition: primaryEntry.definition,
      translation: primaryEntry.translation,
      example: primaryEntry.example,
      entries,
      audioUrl: usAudioUrl || ukAudioUrl,
      usAudioUrl,
      ukAudioUrl
    });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
