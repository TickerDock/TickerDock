import { describe, expect, it } from 'vitest';
import { normalizeExpandedStockGroups, stockGroupForMarket } from './stockGroupModel';

describe('stock group model', () => {
  it('maps all quote markets into stable view groups', () => {
    expect(stockGroupForMarket('sh')).toBe('cn-stock');
    expect(stockGroupForMarket('sz')).toBe('cn-stock');
    expect(stockGroupForMarket('bj')).toBe('cn-stock');
    expect(stockGroupForMarket('hk')).toBe('hk-stock');
    expect(stockGroupForMarket('us')).toBe('us-stock');
    expect(stockGroupForMarket('cn-future')).toBe('cn-future');
    expect(stockGroupForMarket('global-future')).toBe('global-future');
  });

  it('filters unknown and duplicate persisted group IDs', () => {
    expect(normalizeExpandedStockGroups(['cn-stock', 'unknown', 'cn-stock', 'us-stock']))
      .toEqual(['cn-stock', 'us-stock']);
    expect(normalizeExpandedStockGroups('cn-stock')).toEqual([]);
  });
});
