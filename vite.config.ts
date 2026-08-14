import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Local/Codespaces dev should serve the main game at `/`.
  // Production builds keep the repository base required by GitHub Pages.
  base: command === 'serve' ? '/' : '/astral-game/',
}));
