import { describe, expect, it } from 'vitest';
import { FlashNewsItem } from '@stock-fund/domain';
import { buildStockAnalysisInput, researchKeywordForStockCode } from '../src/stockAnalysisModel';

describe('buildStockAnalysisInput', () => {
  it('limits stock research queries to normalized A-share codes', () => {
    expect(researchKeywordForStockCode('sh600519')).toBe('600519');
    expect(researchKeywordForStockCode('SZ000001')).toBe('000001');
    expect(researchKeywordForStockCode('bj430047')).toBe('430047');
    expect(researchKeywordForStockCode('hk00700')).toBeUndefined();
    expect(researchKeywordForStockCode('usr_ixic')).toBeUndefined();
  });

  it('includes bounded, allowlisted flash-news context', () => {
    const news: FlashNewsItem[] = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      title: index === 0 ? 't'.repeat(600) : `Title ${index}`,
      summary: index === 0 ? 's'.repeat(900) : `Summary ${index}`,
      time: `2026-07-17T01:${String(index).padStart(2, '0')}:00.000Z`,
      important: index === 0,
      kind: 'news',
      source: index % 2 ? 'jin10' : 'xuangubao',
      url: `https://untrusted.example/${index}`,
    }));

    const parsed = JSON.parse(buildStockAnalysisInput('sh600000', 'Example', '3m', [{
      date: '2026-07-16', open: 10, close: 11, high: 12, low: 9, volume: 100,
    }], news, [{
      id: 'r1', title: 'Research', summary: 'Detail', time: '2026-07-17 08:00:00',
      source: 'jiuyangongshe', url: 'https://www.jiuyangongshe.com/a/r1',
    }])) as Record<string, any>;

    expect(parsed.klines).toEqual([{
      date: '2026-07-16', open: 10, close: 11, high: 12, low: 9, volume: 100,
    }]);
    expect(parsed.historyRange).toBe('3m');
    expect(parsed.recentFlashNews).toHaveLength(20);
    expect(parsed.recentFlashNews[0]).toEqual({
      source: 'xuangubao',
      time: '2026-07-17T01:00:00.000Z',
      title: 't'.repeat(500),
      summary: 's'.repeat(800),
      important: true,
    });
    expect(JSON.stringify(parsed)).not.toContain('untrusted.example');
    expect(JSON.stringify(parsed)).not.toContain('"id"');
    expect(parsed.recentStockResearch).toEqual([{
      source: 'jiuyangongshe', time: '2026-07-17 08:00:00',
      title: 'Research', summary: 'Detail',
    }]);
  });
});


