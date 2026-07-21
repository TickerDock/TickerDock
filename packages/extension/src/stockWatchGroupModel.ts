export interface StockWatchGroup {
  name: string;
  codes: string[];
}

export function resolveStockWatchGroups(
  namesValue: unknown,
  listsValue: unknown,
  legacyCodesValue: unknown,
  listsConfigured: boolean
): StockWatchGroup[] {
  const legacyCodes = uniqueStrings(legacyCodesValue);
  if (!listsConfigured
    || !Array.isArray(listsValue)
    || (listsValue.length === 0 && legacyCodes.length > 0)) {
    return [{ name: 'My Stocks', codes: legacyCodes }];
  }
  const names = stringArray(namesValue).map((name) => name.trim());
  const groups = listsValue.map((codes, index) => ({
    name: names[index] || `Stock Group ${index + 1}`,
    codes: uniqueStrings(codes),
  }));
  return groups.length ? groups : [{ name: 'My Stocks', codes: [] }];
}

export function normalizeStockWatchGroups(groups: readonly StockWatchGroup[]): StockWatchGroup[] {
  return groups.map(({ name, codes }, index) => ({
    name: name.trim() || `Stock Group ${index + 1}`,
    codes: uniqueStrings(codes),
  }));
}

export function flattenStockWatchGroups(groups: readonly StockWatchGroup[]): string[] {
  return uniqueStrings(groups.flatMap(({ codes }) => codes));
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim() !== ''))];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
