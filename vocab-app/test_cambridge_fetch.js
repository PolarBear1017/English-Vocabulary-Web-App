import * as cheerio from 'cheerio';
console.log("Cheerio imported");
const start = Date.now();
try {
  const res = await fetch('https://dictionary.cambridge.org/dictionary/english-chinese-traditional/apple', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7'
    }
  });
  console.log("Fetch finished in", Date.now() - start, "ms. Status:", res.status);
  const html = await res.text();
  console.log("HTML length:", html.length);
  const $ = cheerio.load(html);
  console.log("Cheerio loaded HTML");
  const title = $('.di-title').first().text();
  console.log("Title found:", title);
} catch (e) {
  console.error("Error during run:", e);
}
