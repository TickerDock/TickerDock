import { describe, expect, it } from 'vitest';
import { LEGACY_COMMAND_ALIASES, LEGACY_EXTENSION_ID } from '../src/legacyCommandModel';

describe('legacy command aliases', () => {
  it('uses unique old command identifiers and current command targets', () => {
    const sources = LEGACY_COMMAND_ALIASES.map(([source]) => source);
    expect(new Set(sources).size).toBe(sources.length);
    expect(sources.every((command) => command.startsWith('leek-fund.'))).toBe(true);
    expect(LEGACY_COMMAND_ALIASES.every(([, target]) => target.startsWith('stock-fund.'))).toBe(true);
    expect(LEGACY_EXTENSION_ID).toBe('iarjian.leek-fund');
  });
});


