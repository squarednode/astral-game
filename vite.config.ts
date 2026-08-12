import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  // Local dev should serve from localhost root. Production/GitHub Pages keeps the repo subpath.
  base: command === 'serve' ? '/' : '/astral-game/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        sideview: resolve(rootDir, 'sideview.html'),
      },
    },
  },
}));
