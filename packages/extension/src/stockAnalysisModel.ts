import { FlashNewsItem, Kline, StockResearchItem } from '@stock-fund/domain';

const MAX_NEWS_ITEMS = 20;
const MAX_NEWS_TITLE_LENGTH = 500;
const MAX_NEWS_SUMMARY_LENGTH = 800;
const MAX_RESEARCH_ITEMS = 10;
const MAX_RESEARCH_TITLE_LENGTH = 500;
const MAX_RESEARCH_SUMMARY_LENGTH = 1200;

export function researchKeywordForStockCode(code: string): string | undefined {
  const matched = /^(?:sh|sz|bj)(\d{6})$/i.exec(code.trim());
  return matched?.[1];
}

export function buildStockAnalysisInput(
  code: string,
  name: string,
  historyRange: string,
  klines: readonly Kline[],
  news: readonly FlashNewsItem[],
  research: readonly StockResearchItem[] = []
): string {
  return JSON.stringify({
    code,
    name,
    period: 'daily',
    historyRange,
    adjustment: 'qfq',
    klines: klines.map(({ date, open, close, high, low, volume }) => ({
      date, open, close, high, low, volume,
    })),
    recentFlashNews: news.slice(0, MAX_NEWS_ITEMS).map(({ source, time, title, summary, important }) => ({
      source,
      time,
      title: title.slice(0, MAX_NEWS_TITLE_LENGTH),
      summary: summary.slice(0, MAX_NEWS_SUMMARY_LENGTH),
      important,
    })),
    recentStockResearch: research.slice(0, MAX_RESEARCH_ITEMS).map(({ source, time, title, summary }) => ({
      source,
      time,
      title: title.slice(0, MAX_RESEARCH_TITLE_LENGTH),
      summary: summary.slice(0, MAX_RESEARCH_SUMMARY_LENGTH),
    })),
  });
}
