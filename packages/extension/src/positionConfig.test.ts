import { describe, expect, it } from 'vitest';
import { parseFundPositions, parseStockPositions } from './positionConfig';

describe('legacy position configuration', () => {
  it('maps legacy stockPrice fields', () => {
    const positions = parseStockPositions({
      sh600519: { amount: 10, unitPrice: 1200, todayUnitPrice: 1250, isSellOut: true },
      invalid: { amount: 0, unitPrice: 1 },
    });
    expect(positions.get('sh600519')).toEqual({
      code: 'sh600519', quantity: 10, costPrice: 1200, todayTradePrice: 1250, soldOut: true,
    });
    expect(positions.has('invalid')).toBe(false);
  });

  it('uses stored fund shares when available', () => {
    const positions = parseFundPositions({
      '110022': { amount: 1500, shares: 900, unitPrice: 1.5 },
    });
    expect(positions.get('110022')).toEqual({ code: '110022', shares: 900, costNav: 1.5 });
  });

  it('derives fund shares from legacy amount and cost NAV', () => {
    const positions = parseFundPositions({
      '110022': { amount: 1500, unitPrice: 1.5 },
    });
    expect(positions.get('110022')).toEqual({ code: '110022', shares: 1000, costNav: 1.5 });
  });
});
