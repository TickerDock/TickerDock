import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.build/**', 'dist/**', 'dist-integration/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: { statements: 25, branches: 70, functions: 65, lines: 25 },
    },
  },
});
