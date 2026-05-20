import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? './' : '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/testSetup.ts',
    css: true
  }
});
