export type ScheduledMarket = 'cn' | 'hk' | 'us' | 'cn-future' | 'global-future' | 'fund';

const HOLIDAYS: Partial<Record<ScheduledMarket, ReadonlySet<string>>> = {
  cn: new Set([
    '2026-01-01', '2026-01-02',
    '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-23',
    '2026-04-06',
    '2026-05-01', '2026-05-04', '2026-05-05',
    '2026-06-19', '2026-09-25',
    '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07',
  ]),
  hk: new Set([
    '2026-01-01', '2026-02-17', '2026-02-18', '2026-02-19',
    '2026-04-03', '2026-04-06', '2026-04-07', '2026-05-01', '2026-05-25',
    '2026-07-01', '2026-09-26', '2026-10-01', '2026-10-19', '2026-12-25', '2026-12-26',
  ]),
  us: new Set([
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
    '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  ]),
};

export function marketForStockCode(code: string): ScheduledMarket | undefined {
  const normalized = code.toUpperCase();
  if (/^(SH|SZ)/.test(normalized)) return 'cn';
  if (normalized.startsWith('HK')) return 'hk';
  if (/^(US|USR_|GB_|0(?:DJI|IXIC|INX))/.test(normalized)) return 'us';
  if (normalized.startsWith('NF_')) return 'cn-future';
  if (/^(HF|HF_)/.test(normalized)) return 'global-future';
  return undefined;
}

export function isMarketOpen(market: ScheduledMarket, now = new Date()): boolean {
  if (market === 'global-future') return isGlobalFutureOpen(now);
  const zone = market === 'us' ? 'America/New_York' : market === 'hk' ? 'Asia/Hong_Kong' : 'Asia/Shanghai';
  const local = zonedParts(now, zone);
  if (market === 'cn-future') return isCnFutureOpen(local, now);
  if (!isBusinessDay(local, market === 'fund' ? 'cn' : market)) return false;
  const minute = local.hour * 60 + local.minute;
  if (market === 'cn' || market === 'fund') return inSessions(minute, [[9 * 60 + 25, 11 * 60 + 35], [12 * 60 + 55, 15 * 60 + 5]]);
  if (market === 'hk') return inSessions(minute, [[9 * 60 + 25, 12 * 60 + 5], [12 * 60 + 55, 16 * 60 + 15]]);
  return inSessions(minute, [[4 * 60, 20 * 60]]);
}

function isCnFutureOpen(local: ZonedParts, now: Date): boolean {
  const minute = local.hour * 60 + local.minute;
  if (inSessions(minute, [[8 * 60 + 55, 11 * 60 + 35], [13 * 60 + 25, 15 * 60 + 5]])) {
    return isBusinessDay(local, 'cn');
  }
  if (minute >= 20 * 60 + 55) {
    const next = zonedParts(new Date(now.getTime() + 24 * 60 * 60 * 1000), 'Asia/Shanghai');
    return isBusinessDay(local, 'cn') && isBusinessDay(next, 'cn');
  }
  if (minute <= 2 * 60 + 35) {
    return isBusinessDay(local, 'cn');
  }
  return false;
}

function isGlobalFutureOpen(now: Date): boolean {
  const local = zonedParts(now, 'America/New_York');
  const minute = local.hour * 60 + local.minute;
  if (local.weekday === 0) return minute >= 18 * 60;
  if (local.weekday === 6) return false;
  if (local.weekday === 5) return minute < 17 * 60;
  return minute < 17 * 60 || minute >= 18 * 60;
}

function isBusinessDay(local: ZonedParts, holidayMarket: 'cn' | 'hk' | 'us'): boolean {
  return local.weekday >= 1 && local.weekday <= 5 && !HOLIDAYS[holidayMarket]?.has(local.date);
}

function inSessions(minute: number, sessions: readonly (readonly [number, number])[]): boolean {
  return sessions.some(([start, end]) => minute >= start && minute <= end);
}

interface ZonedParts {
  date: string;
  weekday: number;
  hour: number;
  minute: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    weekday: weekdays[value('weekday')] ?? -1,
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  };
}
