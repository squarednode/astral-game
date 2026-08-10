import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/astral-game/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        sideview: resolve(rootDir, 'sideview.html'),
      },
    },
  },
});
