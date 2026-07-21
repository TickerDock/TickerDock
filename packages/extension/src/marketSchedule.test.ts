import { describe, expect, it } from 'vitest';
import { isMarketOpen, marketForStockCode } from './marketSchedule';

const utc = (value: string) => new Date(`${value}Z`);

describe('market schedule', () => {
  it('maps legacy watchlist codes to scheduled markets', () => {
    expect(marketForStockCode('sh600519')).toBe('cn');
    expect(marketForStockCode('hk00700')).toBe('hk');
    expect(marketForStockCode('usr_aapl')).toBe('us');
    expect(marketForStockCode('nf_IF0')).toBe('cn-future');
    expect(marketForStockCode('hf_OIL')).toBe('global-future');
  });

  it('honors mainland lunch breaks, weekends, and known holidays', () => {
    expect(isMarketOpen('cn', utc('2026-07-17T02:00:00'))).toBe(true); // Friday 10:00 CST
    expect(isMarketOpen('cn', utc('2026-07-17T04:00:00'))).toBe(false); // Lunch break
    expect(isMarketOpen('cn', utc('2026-07-18T02:00:00'))).toBe(false); // Saturday
    expect(isMarketOpen('cn', utc('2026-10-01T02:00:00'))).toBe(false); // National Day
  });

  it('uses New York local time so US daylight saving time is respected', () => {
    expect(isMarketOpen('us', utc('2026-07-17T14:00:00'))).toBe(true); // 10:00 EDT
    expect(isMarketOpen('us', utc('2026-01-20T15:00:00'))).toBe(true); // 10:00 EST
    expect(isMarketOpen('us', utc('2026-07-03T14:00:00'))).toBe(false); // Observed Independence Day
  });

  it('supports cross-midnight futures sessions and the global maintenance break', () => {
    expect(isMarketOpen('cn-future', utc('2026-07-16T17:00:00'))).toBe(true); // Friday 01:00 CST
    expect(isMarketOpen('cn-future', utc('2026-07-17T13:00:00'))).toBe(false); // Friday 21:00 CST
    expect(isMarketOpen('cn-future', utc('2026-09-24T13:00:00'))).toBe(false); // Night before holiday
    expect(isMarketOpen('global-future', utc('2026-07-17T21:30:00'))).toBe(false); // Friday 17:30 EDT
    expect(isMarketOpen('global-future', utc('2026-07-19T23:00:00'))).toBe(true); // Sunday 19:00 EDT
  });
});
