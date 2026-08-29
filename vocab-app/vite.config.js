import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/dictionary')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            req.query = Object.fromEntries(urlObj.searchParams.entries());
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              }
              res.end(JSON.stringify(data));
            };
            res.send = (data) => {
              res.end(data);
            };
            const { default: handler } = await import('./api/dictionary.js');
            await handler(req, res);
            return;
          } catch (err) {
            console.error('Dev API dictionary error:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        if (req.url && req.url.startsWith('/api/proxy-audio')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            req.query = Object.fromEntries(urlObj.searchParams.entries());
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              }
              res.end(JSON.stringify(data));
            };
            res.send = (data) => {
              res.end(data);
            };
            const { default: handler } = await import('./api/proxy-audio.js');
            await handler(req, res);
            return;
          } catch (err) {
            console.error('Dev API proxy-audio error:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  server: {
    watch: {
      ignored: ['**/dist/**', '**/.vercel/**', '**/node_modules/**'],
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
