import { describe, expect, it } from 'vitest';
import { parseReminderState, serializeReminderState } from './reminderState';

const quote = {
  code: 'sh600519', name: 'Moutai', market: 'sh' as const, price: 100,
  previousClose: 99, high: 101, low: 98, change: 1, changeRatio: 0.01,
  source: 'fixture', status: 'live' as const,
};

describe('reminder state', () => {
  it('round-trips quote snapshots and cooldown timestamps', () => {
    const stored = serializeReminderState({
      previous: new Map([[quote.code, quote]]),
      remindedAt: new Map([[quote.code, 900]]),
    }, 1000);
    const parsed = parseReminderState(stored, 1100);
    expect(parsed.previous.get(quote.code)).toEqual(quote);
    expect(parsed.remindedAt.get(quote.code)).toBe(900);
  });

  it('drops stale, future, or malformed state', () => {
    expect(parseReminderState(serializeReminderState({
      previous: new Map([[quote.code, quote]]), remindedAt: new Map(),
    }, 1000), 8 * 24 * 60 * 60 * 1000).previous.size).toBe(0);
    expect(parseReminderState({ version: 1, savedAt: 2000, previous: [{ code: 'bad' }], remindedAt: { bad: 'no' } }, 1000))
      .toEqual({ previous: new Map(), remindedAt: new Map() });
  });
});
