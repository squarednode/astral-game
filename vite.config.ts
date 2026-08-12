import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/astral-game/',
  server: {
    host: '0.0.0.0',
  },
  plugins: command === 'serve'
    ? [{
        name: 'astral-sideview-dev-aliases',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = req.url?.split('?')[0] ?? '';
            const sideviewAliases = new Set([
              '/',
              '/sideview',
              '/sideview/',
              '/sideview.html',
              '/astral-game',
              '/astral-game/',
              '/astral-game/sideview',
              '/astral-game/sideview/',
              '/astral-game/sideview.html',
            ]);

            if (sideviewAliases.has(pathname) && pathname !== '/sideview.html') {
              const query = req.url?.includes('?') ? `?${req.url.split('?').slice(1).join('?')}` : '';
              res.statusCode = 302;
              res.setHeader('Location', `/sideview.html${query}`);
              res.end();
              return;
            }
            next();
          });
        },
      }]
    : [],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        sideview: resolve(rootDir, 'sideview.html'),
      },
    },
  },
}));
