import { FundPosition, localDateString, StockPosition } from '@tickerdock/domain';
import { readWebviewEnvelope } from './webviewProtocol';

export interface PositionManagerItem {
  code: string;
  name: string;
}

export function mergePositionManagerItems(
  watched: readonly PositionManagerItem[],
  positionCodes: Iterable<string>
): PositionManagerItem[] {
  const items = new Map(watched.map((item) => [item.code, item]));
  for (const code of positionCodes) {
    if (!items.has(code)) items.set(code, { code, name: code });
  }
  return [...items.values()];
}

export function parseStockPositionSaveMessage(
  message: unknown,
  allowedCodes: ReadonlySet<string>
): StockPosition[] | undefined {
  const payload = savePayload(message, 'saveStockPositions');
  if (!payload) return undefined;
  return parseUniquePositions(payload, allowedCodes, (item, code) => {
    const quantity = requiredPositiveNumber(item.quantity, `${code} quantity`);
    const costPrice = requiredPositiveNumber(item.costPrice, `${code} cost price`);
    const todayTradePrice = optionalPositiveNumber(item.todayTradePrice, `${code} today trade price`);
    if (typeof item.soldOut !== 'boolean') throw new Error(`${code} sold-out state is invalid.`);
    const soldOutDate = item.soldOut
      ? optionalDateString(item.soldOutDate, `${code} sold-out date`) || localDateString()
      : undefined;
    return { code, quantity, costPrice, todayTradePrice, soldOut: item.soldOut, soldOutDate };
  });
}

export function parseFundPositionSaveMessage(
  message: unknown,
  allowedCodes: ReadonlySet<string>
): FundPosition[] | undefined {
  const payload = savePayload(message, 'saveFundPositions');
  if (!payload) return undefined;
  return parseUniquePositions(payload, allowedCodes, (item, code) => ({
    code,
    shares: requiredPositiveNumber(item.shares, `${code} shares`),
    costNav: requiredPositiveNumber(item.costNav, `${code} cost NAV`),
  }));
}

function savePayload(message: unknown, command: string): Record<string, unknown>[] | undefined {
  const payload = readWebviewEnvelope(message, command);
  if (!payload) return undefined;
  if (!Array.isArray(payload.positions)) throw new Error('Position payload must be an array.');
  return payload.positions.map((item) => {
    if (!isRecord(item)) throw new Error('Each position must be an object.');
    return item;
  });
}

function parseUniquePositions<T>(
  payload: readonly Record<string, unknown>[],
  allowedCodes: ReadonlySet<string>,
  parse: (item: Record<string, unknown>, code: string) => T
): T[] {
  if (payload.length > allowedCodes.size) throw new Error('Position payload contains too many rows.');
  const seen = new Set<string>();
  return payload.map((item) => {
    if (typeof item.code !== 'string' || !allowedCodes.has(item.code)) {
      throw new Error('Position payload contains an unknown code.');
    }
    if (seen.has(item.code)) throw new Error(`Duplicate position code: ${item.code}.`);
    seen.add(item.code);
    return parse(item, item.code);
  });
}

function requiredPositiveNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return value;
}

function optionalPositiveNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredPositiveNumber(value, label);
}

function optionalDateString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
