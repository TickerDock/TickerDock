import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'chrome114',
    chunkSizeWarningLimit: 650,
    outDir: '../extension/dist/webview-ui',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'webview.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'json-summary'],
      thresholds: { statements: 75, branches: 60, functions: 60, lines: 75 },
    },
  },
});
