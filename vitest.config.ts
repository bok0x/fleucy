import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['.worktrees/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
