import { describe, expect, it } from 'vitest';
import { SETTINGS_ENTRIES } from './settingsModel';

describe('settings sidebar model', () => {
  it('keeps the three requested settings entries in order', () => {
    expect(SETTINGS_ENTRIES).toEqual([
      { label: '\u97ed\u83dc\u4e2d\u5fc3', command: 'stock-fund.openLeekCenter', icon: 'home' },
      { label: 'AI \u52a9\u624b\u914d\u7f6e', command: 'stock-fund.configureAi', icon: 'sparkle' },
      { label: '\u4e2a\u6027\u5b9a\u5236', command: 'stock-fund.openPersonalization', icon: 'settings-gear' },
    ]);
  });
});
