import { describe, expect, it } from 'vitest';
import { filterFundNavRange, trendSummary } from '../src/trendModel';

describe('trend model', () => {
  const nav = (date: string) => ({ date, nav: 1, accumulatedNav: 1, source: 'fixture' });

  it('filters fund history relative to the latest available NAV date', () => {
    expect(filterFundNavRange([
      nav('2025-01-01'), nav('2026-01-15'), nav('2026-06-15'), nav('2026-07-15'),
    ], '6m').map(({ date }) => date)).toEqual(['2026-01-15', '2026-06-15', '2026-07-15']);
  });

  it('calculates period summary without dividing by zero', () => {
    expect(trendSummary([10, 8, 12])).toEqual({ first: 10, latest: 12, high: 12, low: 8, changeRatio: 0.2 });
    expect(trendSummary([0, 2])?.changeRatio).toBe(0);
    expect(trendSummary([])).toBeUndefined();
  });
});


