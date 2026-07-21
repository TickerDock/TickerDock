import { describe, expect, it } from 'vitest';
import {
  legacyFundSortMode,
  legacySortMode,
  nextFundAmountSortMode,
  nextFundChangeSortMode,
  nextSortMode,
  sortByChange,
  sortFunds,
} from './sortModel';

describe('sort model', () => {
  it('cycles through descending, ascending, and original modes', () => {
    expect(nextSortMode('original')).toBe('descending');
    expect(nextSortMode('descending')).toBe('ascending');
    expect(nextSortMode('ascending')).toBe('original');
  });

  it('sorts without mutating input and maps legacy numeric values', () => {
    const items = [{ changeRatio: 0.1 }, { changeRatio: -0.2 }];
    expect(sortByChange(items, 'descending').map(({ changeRatio }) => changeRatio)).toEqual([0.1, -0.2]);
    expect(items.map(({ changeRatio }) => changeRatio)).toEqual([0.1, -0.2]);
    expect(legacySortMode(1)).toBe('ascending');
    expect(legacySortMode(-1)).toBe('descending');
  });

  it('sorts funds by position value and maps legacy amount modes', () => {
    const funds = [
      { changeRatio: 0.1, marketValue: 100 },
      { changeRatio: -0.2, marketValue: 300 },
      { changeRatio: 0, marketValue: 0 },
    ];
    expect(sortFunds(funds, 'amount-descending').map(({ marketValue }) => marketValue)).toEqual([300, 100, 0]);
    expect(sortFunds(funds, 'amount-ascending').map(({ marketValue }) => marketValue)).toEqual([0, 100, 300]);
    expect(legacyFundSortMode(2)).toBe('amount-ascending');
    expect(legacyFundSortMode(-2)).toBe('amount-descending');
    expect(nextFundAmountSortMode('original')).toBe('amount-descending');
    expect(nextFundAmountSortMode('amount-descending')).toBe('amount-ascending');
    expect(nextFundChangeSortMode('amount-ascending')).toBe('descending');
  });
});
