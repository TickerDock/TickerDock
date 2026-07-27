import { describe, expect, it } from 'vitest';
import { formatQuotePrice, formatStockQuoteTooltip } from '../src/quoteFormat';

describe('quote formatting', () => {
  it('uses the same adaptive precision for sidebar and status bar prices', () => {
    expect(formatQuotePrice(3123.456)).toBe('3123.46');
    expect(formatQuotePrice(123.4)).toBe('123.4');
    expect(formatQuotePrice(12.34567)).toBe('12.3457');
    expect(formatQuotePrice(Number.NaN)).toBe('--');
  });

  it('formats the shared stock tooltip for the sidebar and status bar', () => {
    expect(formatStockQuoteTooltip({
      code: 'sh600000',
      name: '浦发银行',
      market: 'sh',
      price: 10.25,
      previousClose: 10,
      open: 10.1,
      high: 10.5,
      low: 9.98,
      change: 0.25,
      changeRatio: 0.025,
      source: 'stock-api',
      status: 'live',
    })).toBe([
      '浦发银行 (sh600000)',
      '现价：10.25',
      '涨跌：+0.25（+2.50%）',
      '开盘：10.1',
      '最高/最低：10.5 / 9.98',
      '昨收：10',
      '来源：stock-api',
    ].join('\n'));
  });
});


