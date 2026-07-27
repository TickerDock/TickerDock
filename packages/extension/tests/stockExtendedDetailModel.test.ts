import { describe, expect, it } from 'vitest';
import { buildStockExtendedDetail } from '../src/stockExtendedDetailModel';

describe('stock extended detail model', () => {
  it('derives technical ranges from recent candles and keeps research', () => {
    const detail = buildStockExtendedDetail({
      code: 'sh600519', name: 'Example', market: 'sh', price: 105,
      previousClose: 100, high: 110, low: 95, change: 5, changeRatio: 0.05,
      source: 'test', status: 'live',
    }, [
      { date: '2026-01-01', open: 90, close: 100, high: 110, low: 80 },
      { date: '2026-01-02', open: 100, close: 105, high: 115, low: 95 },
    ], [], ['iWencai diagnosis', 'Community heat']);
    expect(detail.technical).toMatchObject({
      currentPrice: 105, movingAverage20: 102.5, support: 80, resistance: 115,
      takeProfit: 115, stopLoss: 80, sampleSize: 2,
    });
    expect(detail.unavailableSources).toEqual(['iWencai diagnosis', 'Community heat']);
  });
});


