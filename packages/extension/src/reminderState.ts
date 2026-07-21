import { Memento } from 'vscode';
import { Market, StockQuote } from '@stock-fund/domain';

const STATE_KEY = 'stock-fund.reminderState';
const STATE_VERSION = 1;
const MAX_STATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MARKETS = new Set<Market>(['sh', 'sz', 'bj', 'hk', 'us', 'cn-future', 'global-future']);

export interface ReminderState {
  previous: Map<string, StockQuote>;
  remindedAt: Map<string, number>;
}

interface StoredReminderState {
  version: typeof STATE_VERSION;
  savedAt: number;
  previous: StockQuote[];
  remindedAt: Record<string, number>;
}

export class ReminderStateRepository {
  constructor(private readonly storage: Memento) {}

  load(now = Date.now()): ReminderState {
    return parseReminderState(this.storage.get<unknown>(STATE_KEY), now);
  }

  save(state: ReminderState, now = Date.now()): Thenable<void> {
    return this.storage.update(STATE_KEY, serializeReminderState(state, now));
  }
}

export function parseReminderState(value: unknown, now = Date.now()): ReminderState {
  const empty = (): ReminderState => ({ previous: new Map(), remindedAt: new Map() });
  if (!isRecord(value) || value.version !== STATE_VERSION || typeof value.savedAt !== 'number') return empty();
  if (!Number.isFinite(value.savedAt) || now - value.savedAt > MAX_STATE_AGE_MS || value.savedAt > now + 60_000) return empty();
  const previous = Array.isArray(value.previous)
    ? value.previous.filter(isStockQuote).map((quote) => [quote.code, quote] as const)
    : [];
  const remindedAt = isRecord(value.remindedAt)
    ? Object.entries(value.remindedAt).flatMap(([code, timestamp]) =>
        typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp <= now
          ? [[code, timestamp] as const]
          : [])
    : [];
  return { previous: new Map(previous), remindedAt: new Map(remindedAt) };
}

export function serializeReminderState(state: ReminderState, now = Date.now()): StoredReminderState {
  return {
    version: STATE_VERSION,
    savedAt: now,
    previous: [...state.previous.values()],
    remindedAt: Object.fromEntries(state.remindedAt),
  };
}

function isStockQuote(value: unknown): value is StockQuote {
  if (!isRecord(value)) return false;
  return typeof value.code === 'string'
    && typeof value.name === 'string'
    && typeof value.market === 'string'
    && MARKETS.has(value.market as Market)
    && finiteNumber(value.price)
    && finiteNumber(value.previousClose)
    && finiteNumber(value.high)
    && finiteNumber(value.low)
    && finiteNumber(value.change)
    && finiteNumber(value.changeRatio)
    && typeof value.source === 'string'
    && (value.status === 'live' || value.status === 'unavailable');
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
