import * as cheerio from 'cheerio';

const mockHtml = `
<div class="entry-body__el">
    <div class="pos-header dpos-h">
        <div class="posgram dpos-g hdib lmr-5">
            <span class="pos dpos">noun</span>
        </div>
    </div>
    <div class="pos-body">
        <div class="pr dsense">
            <div class="sense-body dsense_b">
                <div class="def-block ddef_block">
                    <div class="ddef_h">
                        <div class="def ddef_d db">The physical or mental power or skill needed to do something</div>
                    </div>
                    <div class="def-body ddef_b">
                        <span class="trans dtrans dtrans-se">能力；才能</span>
                        <div class="examp dexamp">
                            <span class="eg deg">She had the ability to explain things clearly.</span>
                            <span class="trans dtrans dtrans-se hdb">她有解釋事情清楚的能力。</span>
                        </div>
                    </div>
                </div>
                <div class="def-block ddef_block">
                     <div class="ddef_h">
                        <div class="def ddef_d db">Another definition</div>
                    </div>
                    <div class="def-body ddef_b">
                         <span class="trans dtrans dtrans-se">另一個定義</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

function testScraper(html) {
    const $ = cheerio.load(html);
    const entries = [];

    $('.def-block').each((_, block) => {
        const definitionText = $(block).find('.def').first().text().replace(':', '').trim();

        // OLD LOGIC (Simulated failure)
        // const translationText = $(block).find('.trans').first().text().trim();

        // NEW LOGIC
        // Exclude .trans that are inside .examp
        let translationText = $(block).find('.trans')
            .filter((i, el) => $(el).parents('.examp').length === 0)
            .first()
            .text()
            .trim();

        // If simple find fails (maybe different structure), try direct child or exclude known bad parents
        if (!translationText) {
            // Fallback or potentially looser check if strict check fails?
            // For now, let's see if the filter works.
            // The structure is usually .def-body > .trans
            translationText = $(block).find('.def-body > .trans').first().text().trim();
        }

        const examples = $(block)
            .find('.examp')
            .map((_, el) => $(el).text().trim())
            .get()
            .filter(Boolean);

        // POS extraction logic
        // Look up for closest .entry-body__el or .pr or just find the previous .pos-header
        // In the real DOM, .def-block is inside .sense-body, inside .pr, inside .pos-body...
        // The pos is in .pos-header which is a sibling of .pos-body

        let pos = $(block).closest('.entry-body__el').find('.pos').first().text();
        if (!pos) pos = 'unknown';

        if (definitionText) {
            entries.push({
                definition: definitionText,
                translation: translationText,
                pos: pos,
                examples: examples
            });
        }
    });

    return entries;
}

const results = testScraper(mockHtml);
console.log(JSON.stringify(results, null, 2));

if (results[0].translation === '能力；才能') {
    console.log('TEST PASSED: Correctly extracted main translation.');
} else {
    console.log('TEST FAILED: extracted:', results[0].translation);
}

if (results[0].pos === 'noun') {
    console.log('TEST PASSED: Correctly extracted POS.');
} else {
    console.log('TEST FAILED: POS extracted:', results[0].pos);
}
