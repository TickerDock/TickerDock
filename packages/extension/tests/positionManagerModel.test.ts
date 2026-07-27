import { describe, expect, it } from 'vitest';
import {
  mergePositionManagerItems,
  parseFundPositionSaveMessage,
  parseStockPositionSaveMessage,
} from '../src/positionManagerModel';

describe('position manager model', () => {
  const message = (type: string, positions: unknown[]) => ({
    version: 1, type, requestId: 'test', payload: { positions },
  });
  it('keeps configured positions that are no longer watched', () => {
    expect(mergePositionManagerItems([{ code: 'sh600000', name: 'Watched' }], ['sh600000', 'hk00700']))
      .toEqual([{ code: 'sh600000', name: 'Watched' }, { code: 'hk00700', name: 'hk00700' }]);
  });

  it('validates stock positions and permits an empty replacement', () => {
    const allowed = new Set(['sh600000']);
    expect(parseStockPositionSaveMessage(message('saveStockPositions', [{
      code: 'sh600000', quantity: 100, costPrice: 10, todayTradePrice: 11, soldOut: false,
    }]), allowed)).toEqual([{
      code: 'sh600000', quantity: 100, costPrice: 10, todayTradePrice: 11, soldOut: false,
    }]);
    expect(parseStockPositionSaveMessage(message('saveStockPositions', []), allowed)).toEqual([]);
    expect(() => parseStockPositionSaveMessage(message('saveStockPositions', [{
      code: 'unknown', quantity: 1, costPrice: 1, soldOut: false,
    }]), allowed)).toThrow('unknown code');
  });

  it('rejects partial, duplicate, and non-positive fund positions', () => {
    const allowed = new Set(['110022']);
    expect(parseFundPositionSaveMessage(message('saveFundPositions', [{
      code: '110022', shares: 1000, costNav: 1.5,
    }]), allowed)).toEqual([{ code: '110022', shares: 1000, costNav: 1.5 }]);
    expect(() => parseFundPositionSaveMessage(message('saveFundPositions', [{
      code: '110022', shares: 0, costNav: 1.5,
    }]), allowed)).toThrow('greater than zero');
    expect(() => parseFundPositionSaveMessage(message('saveFundPositions', [
      { code: '110022', shares: 1, costNav: 1 }, { code: '110022', shares: 2, costNav: 2 },
    ]), allowed)).toThrow();
  });
});


