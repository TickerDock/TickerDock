import { FundNav } from '@stock-fund/domain';

export type FundTrendRange = '1m' | '3m' | '6m' | '1y' | 'all';

export function filterFundNavRange(data: readonly FundNav[], range: FundTrendRange): FundNav[] {
  const ordered = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (range === 'all' || ordered.length === 0) return ordered;
  const latest = new Date(`${ordered.at(-1)!.date}T00:00:00Z`);
  const cutoff = new Date(latest);
  if (range === '1y') cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  else cutoff.setUTCMonth(cutoff.getUTCMonth() - Number.parseInt(range, 10));
  const cutoffText = cutoff.toISOString().slice(0, 10);
  return ordered.filter(({ date }) => date >= cutoffText);
}

export function trendSummary(values: readonly number[]): {
  first: number;
  latest: number;
  high: number;
  low: number;
  changeRatio: number;
} | undefined {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return undefined;
  const first = finite[0]!;
  const latest = finite.at(-1)!;
  return {
    first,
    latest,
    high: Math.max(...finite),
    low: Math.min(...finite),
    changeRatio: first === 0 ? 0 : (latest - first) / first,
  };
}
