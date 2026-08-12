import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  // Local dev should serve from root. Production/GitHub Pages keeps the repo subpath.
  base: command === 'serve' ? '/' : '/astral-game/',
  server: {
    host: '0.0.0.0',
  },
  plugins: command === 'serve'
    ? [{
        name: 'astral-sideview-dev-root',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url?.split('?')[0];
            if (url === '/' || url === '') {
              res.statusCode = 302;
              res.setHeader('Location', '/sideview.html');
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
