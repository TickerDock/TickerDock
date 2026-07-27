import { describe, expect, it } from 'vitest';
import {
  flattenStockWatchGroups,
  normalizeStockWatchGroups,
  resolveStockWatchGroups,
} from '../src/stockWatchGroupModel';

describe('stock watch groups', () => {
  it('migrates a legacy flat watchlist into My Stocks', () => {
    expect(resolveStockWatchGroups([], [], ['sh600519', 'sh600519', 'usr_aapl'], false)).toEqual([{
      name: 'My Stocks', codes: ['sh600519', 'usr_aapl'],
    }]);
    expect(resolveStockWatchGroups([], [], ['sh600519'], true)).toEqual([{
      name: 'My Stocks', codes: ['sh600519'],
    }]);
  });

  it('normalizes custom groups and creates a compatible flat list', () => {
    const groups = normalizeStockWatchGroups([
      { name: ' A Shares ', codes: ['sh600519', 'sh600519'] },
      { name: 'A Shares', codes: ['usr_aapl'] },
    ]);
    expect(groups).toEqual([
      { name: 'A Shares', codes: ['sh600519'] },
      { name: 'A Shares', codes: ['usr_aapl'] },
    ]);
    expect(flattenStockWatchGroups(groups)).toEqual(['sh600519', 'usr_aapl']);
  });
});


