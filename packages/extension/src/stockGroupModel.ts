import { Market } from '@tickerdock/domain';

export const STOCK_GROUPS = [
  { id: 'cn-stock', label: 'A Shares' },
  { id: 'hk-stock', label: 'Hong Kong Stocks' },
  { id: 'us-stock', label: 'US Stocks' },
  { id: 'cn-future', label: 'Domestic Futures' },
  { id: 'global-future', label: 'Global Futures' },
] as const;

export type StockGroupId = typeof STOCK_GROUPS[number]['id'];

const STOCK_GROUP_IDS = new Set<string>(STOCK_GROUPS.map(({ id }) => id));

export function stockGroupForMarket(market: Market): StockGroupId {
  if (market === 'hk') return 'hk-stock';
  if (market === 'us') return 'us-stock';
  if (market === 'cn-future') return 'cn-future';
  if (market === 'global-future') return 'global-future';
  return 'cn-stock';
}

export function normalizeExpandedStockGroups(value: unknown): StockGroupId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is StockGroupId =>
    typeof item === 'string' && STOCK_GROUP_IDS.has(item)
  ))];
}
