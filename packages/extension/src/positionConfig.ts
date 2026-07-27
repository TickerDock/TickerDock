import { FundPosition, StockPosition } from '@tickerdock/domain';

type UnknownRecord = Record<string, unknown>;

export function parseStockPositions(value: unknown): Map<string, StockPosition> {
  const positions = new Map<string, StockPosition>();
  for (const [code, rawItem] of Object.entries(asRecord(value))) {
    const item = asRecord(rawItem);
    const quantity = positiveNumber(item.amount);
    const costPrice = positiveNumber(item.unitPrice);
    if (!quantity || !costPrice) continue;
    positions.set(code, {
      code,
      quantity,
      costPrice,
      todayTradePrice: positiveNumber(item.todayUnitPrice),
      soldOut: item.isSellOut === true,
      soldOutDate: item.isSellOut === true ? dateString(item.sellOutDate) || '1970-01-01' : undefined,
    });
  }
  return positions;
}

export function parseFundPositions(value: unknown): Map<string, FundPosition> {
  const positions = new Map<string, FundPosition>();
  for (const [code, rawItem] of Object.entries(asRecord(value))) {
    const item = asRecord(rawItem);
    const costNav = positiveNumber(item.unitPrice);
    const storedShares = positiveNumber(item.shares);
    const legacyAmount = positiveNumber(item.amount);
    const shares = storedShares || (costNav && legacyAmount ? legacyAmount / costNav : undefined);
    if (!shares || !costNav) continue;
    positions.set(code, { code, shares, costNav });
  }
  return positions;
}

export function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as UnknownRecord) }
    : {};
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function dateString(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
