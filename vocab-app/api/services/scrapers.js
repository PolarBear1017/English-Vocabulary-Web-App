import * as cheerio from 'cheerio';
import https from 'node:https';
import dns from 'node:dns';

try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    // Ignore in environments where not supported
}

const fetchHttpsText = (url) => {
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 8000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, text: data }));
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({ ok: false, status: 408, text: '' });
        });
        req.on('error', (err) => resolve({ ok: false, status: 500, error: err.message, text: '' }));
    });
};

export const scrapeCambridge = async (word) => {
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

        // Fix: Exclude .trans elements that are inside .examp (examples)
        // The structure is usually .def-body > .trans or .def-block > .trans
        let translationText = $(block).find('.trans')
            .filter((i, el) => $(el).parents('.examp').length === 0)
            .first()
            .text()
            .trim();

        const examples = $(block)
            .find('.examp')
            .map((_, el) => $(el).text().trim())
            .get()
            .filter(Boolean);

        // Smart POS extraction: find the closest POS tag in the hierarchy
        // Usually it's in a previous sibling .pos-header or parent's sibling
        let entryPos = $(block).closest('.entry-body__el').find('.pos').first().text();
        if (!entryPos) entryPos = $(block).closest('.pr').find('.pos').first().text();
        if (!entryPos) entryPos = pos; // Fallback to the top-level POS

        if (definitionText) {
            entries.push({
                definition: definitionText,
                translation: translationText,
                example: examples[0] || '',
                examples,
                pos: entryPos
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

export const scrapeYahoo = async (word) => {
    try {
        const urls = [
            `https://tw.dictionary.search.yahoo.com/search?p=${encodeURIComponent(word)}`,
            `https://tw.dictionary.yahoo.com/dictionary?p=${encodeURIComponent(word)}`
        ];

        let html = null;
        for (const url of urls) {
            const res = await fetchHttpsText(url);
            if (res.ok && res.text && res.text.length > 5000) {
                html = res.text;
                break;
            }
        }

        if (!html) {
            console.error('Yahoo scraper: All endpoints failed or returned empty response');
            return {
                source: 'Yahoo',
                word,
                entries: []
            };
        }

        const $ = cheerio.load(html);
        const entries = [];
        const seenTranslations = new Set();

        // Target the main dictionary card (.dictionaryWordCard)
        const dictionaryCard = $('.dictionaryWordCard').first();

        if (dictionaryCard.length > 0) {
            const listItems = dictionaryCard.find('.compList > ul > li');

            listItems.each((i, el) => {
                const $el = $(el);
                const pos = $el.find('.pos_button').text().trim();
                const defText = $el.find('.dictionaryExplanation').text().trim();

                if (defText) {
                    const meanings = defText.split(';').map(s => s.trim()).filter(Boolean);

                    meanings.forEach(meaning => {
                        const uniqueKey = `${pos}-${meaning}`;

                        if (!seenTranslations.has(uniqueKey)) {
                            seenTranslations.add(uniqueKey);
                            entries.push({
                                definition: '',
                                translation: meaning,
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
                        if (pos && def && !seenTranslations.has(def)) {
                            seenTranslations.add(def);
                            entries.push({
                                definition: '',
                                translation: def,
                                example: '',
                                examples: [],
                                pos: pos || 'unknown'
                            });
                        }
                    }
                });
            }
        }

        let usAudioUrl = '';
        let ukAudioUrl = '';
        let audioUrl = '';

        const audioUrlMatches = html.match(/https:\/\/[\w.-]+\.yimg\.com\/bg\/dict\/[^"]+\.mp3/g);
        if (audioUrlMatches && audioUrlMatches.length > 0) {
            const uniqueAudioUrls = [...new Set(audioUrlMatches)];
            usAudioUrl = uniqueAudioUrls.find(url => url.includes('_us_')) || uniqueAudioUrls[0];
            ukAudioUrl = uniqueAudioUrls.find(url => url.includes('_gb_')) || '';
            audioUrl = usAudioUrl;
        }

        const topTranslation = entries.length > 0 ? entries[0].translation : '';

        return {
            word,
            pos: entries.length > 0 ? entries[0].pos : 'unknown',
            phonetic: '',
            definition: '',
            translation: topTranslation,
            example: '',
            entries,
            audioUrl: audioUrl,
            usAudioUrl: usAudioUrl,
            ukAudioUrl: ukAudioUrl,
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

export const scrapeGoogleTranslate = async (word) => {
    try {
        const clients = ['dict-chrome-ex', 'gtx'];
        let data = null;

        for (const client of clients) {
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=${client}&sl=en&tl=zh-TW&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(word)}`;
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                    }
                });

                if (response.ok) {
                    data = await response.json();
                    break;
                }
            } catch (err) {
                // try next client
            }
        }

        if (!data) {
            console.error('Google Translate API failed on all clients');
            return null;
        }

        // data[0][0][0] contains the primary translation
        let primaryTranslation = data[0]?.[0]?.[0];

        if (!primaryTranslation) {
            return null;
        }

        primaryTranslation = primaryTranslation.trim();

        // Extract phonetic (e.g. data[0][1][3] is English IPA or data[0][1][2])
        const phoneticRaw = data[0]?.[1]?.[3] || data[0]?.[1]?.[2] || '';
        const phonetic = phoneticRaw ? `/${phoneticRaw}/` : '';

        const entries = [];
        const seenTranslations = new Set();

        // 確保最優先的主翻譯不會遺漏，並且放在第一位
        seenTranslations.add(primaryTranslation);
        entries.push({
            definition: '',
            translation: primaryTranslation,
            example: '',
            examples: [],
            pos: 'unknown'
        });

        // data[1] contains distinct parts of speech and their translations
        const extraDefinitions = data[1];

        if (Array.isArray(extraDefinitions)) {
            extraDefinitions.forEach(posBlock => {
                const pos = posBlock[0]; // e.g. "noun"
                const terms = posBlock[1]; // e.g. ["銀行", "岸", ...]

                if (Array.isArray(terms)) {
                    terms.forEach(termRaw => {
                        const term = termRaw.trim();
                        if (!seenTranslations.has(term)) {
                            seenTranslations.add(term);
                            entries.push({
                                definition: '',
                                translation: term,
                                example: '',
                                examples: [],
                                pos: pos
                            });
                        } else if (term === primaryTranslation) {
                            // 若主翻譯剛好在詳解中出現，更新其真實的詞性
                            const primaryEntry = entries.find(e => e.translation === primaryTranslation);
                            if (primaryEntry && primaryEntry.pos === 'unknown') {
                                primaryEntry.pos = pos;
                            }
                        }
                    });
                }
            });
        }

        return {
            word,
            pos: entries.length > 0 ? entries[0].pos : 'unknown',
            phonetic,
            definition: '',
            translation: primaryTranslation,
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
