import { describe, expect, it } from 'vitest';
import { flashNewsKey, unseenFlashNews } from './newsModel';

describe('news model', () => {
  it('uses source-qualified IDs and returns unseen items in chronological order', () => {
    const item = (source: string, id: string, time: string) => ({
      source, id, time, title: id, summary: '', important: false, kind: 'news' as const,
    });
    const first = item('jin10', '1', '2026-01-01T00:00:00Z');
    const second = item('xuangubao', '1', '2026-01-02T00:00:00Z');
    expect(flashNewsKey(first)).toBe('jin10:1');
    expect(unseenFlashNews([second, first], new Set(['jin10:1']))).toEqual([second]);
  });
});
