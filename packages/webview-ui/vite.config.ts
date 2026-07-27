import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'chrome114',
    outDir: '../extension/dist/webview-ui',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'webview.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: { environment: 'jsdom' },
});
