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
        const response = await fetch(url);
        if (!response.ok) {
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
