export type SortMode = 'original' | 'ascending' | 'descending';
export type FundSortMode = SortMode | 'amount-ascending' | 'amount-descending';

export function nextSortMode(current: SortMode): SortMode {
  if (current === 'original') return 'descending';
  if (current === 'descending') return 'ascending';
  return 'original';
}

export function sortByChange<T extends { changeRatio: number }>(items: readonly T[], mode: SortMode): T[] {
  if (mode === 'original') return [...items];
  const direction = mode === 'ascending' ? 1 : -1;
  return [...items].sort((a, b) => (a.changeRatio - b.changeRatio) * direction);
}

export function legacySortMode(value: unknown): SortMode {
  if (value === 1 || value === 'ascending') return 'ascending';
  if (value === -1 || value === 'descending') return 'descending';
  return 'original';
}

export function nextFundChangeSortMode(current: FundSortMode): FundSortMode {
  return current === 'amount-ascending' || current === 'amount-descending'
    ? 'descending'
    : nextSortMode(current);
}

export function nextFundAmountSortMode(current: FundSortMode): FundSortMode {
  return current === 'amount-descending' ? 'amount-ascending' : 'amount-descending';
}

export function sortFunds<T extends { changeRatio: number; marketValue: number }>(
  items: readonly T[],
  mode: FundSortMode
): T[] {
  if (mode === 'amount-ascending' || mode === 'amount-descending') {
    const direction = mode === 'amount-ascending' ? 1 : -1;
    return [...items].sort((a, b) => (a.marketValue - b.marketValue) * direction);
  }
  return sortByChange(items, mode);
}

export function legacyFundSortMode(value: unknown): FundSortMode {
  if (value === 2 || value === 'amount-ascending') return 'amount-ascending';
  if (value === -2 || value === 'amount-descending') return 'amount-descending';
  return legacySortMode(value);
}
