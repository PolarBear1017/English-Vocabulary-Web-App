export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const isCambridge = url.includes('cambridge.org');
        const userAgent = isCambridge
            ? 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const headers = {
            'User-Agent': userAgent,
            'Accept': '*/*',
        };

        if (isCambridge) {
            headers['Referer'] = 'https://dictionary.cambridge.org/';
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
            if (isCambridge && response.status === 403) {
                const isLocal = process.env.NODE_ENV === 'development' ||
                                process.env.VERCEL_ENV === 'development' ||
                                !process.env.VERCEL ||
                                process.env.VERCEL_URL?.includes('localhost');
                if (isLocal) {
                    try {
                        const prodApiUrl = process.env.PROD_API_URL || 'https://spaced-vocabulary.vercel.app';
                        const fallbackRes = await fetch(`${prodApiUrl}/api/proxy-audio?url=${encodeURIComponent(url)}`);
                        if (fallbackRes.ok) {
                            const arrayBuffer = await fallbackRes.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const contentType = fallbackRes.headers.get('content-type') || 'audio/mpeg';
                            res.setHeader('Content-Type', contentType);
                            return res.send(buffer);
                        }
                    } catch (err) {
                        console.warn('Fallback audio proxy failed:', err.message);
                    }
                }
            }
            return res.status(response.status).json({ error: 'Failed to fetch audio' });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Forward the content type
        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        res.setHeader('Content-Type', contentType);

        // Send the buffer
        res.send(buffer);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
