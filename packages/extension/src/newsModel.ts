import { FlashNewsItem } from '@stock-fund/domain';

export function flashNewsKey(item: FlashNewsItem): string {
  return `${item.source}:${item.id}`;
}

export function unseenFlashNews(items: readonly FlashNewsItem[], seen: ReadonlySet<string>): FlashNewsItem[] {
  return items
    .filter((item) => !seen.has(flashNewsKey(item)))
    .sort((a, b) => timestamp(a.time) - timestamp(b.time));
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
