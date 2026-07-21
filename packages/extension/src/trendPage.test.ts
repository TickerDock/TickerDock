import { describe, expect, it } from 'vitest';
import { renderCandleTrendPage, renderFundTrendPage } from './trendPage';

const controls = [{ id: 'day', label: 'Day' }];

describe('trend page', () => {
  it('renders local candlesticks and volume with a nonce-only script policy', () => {
    const html = renderCandleTrendPage('<Unsafe>', [{
      date: '2026-07-16', open: 10, close: 11, high: 12, low: 9, volume: 100,
    }], controls, 'day', 'fixed-nonce');

    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-fixed-nonce'");
    expect(html).toContain('class="volume up"');
    expect(html).toContain('&lt;Unsafe&gt;');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('renders both unit and accumulated NAV lines', () => {
    const html = renderFundTrendPage('Fund', [
      { date: '2026-07-15', nav: 1.1, accumulatedNav: 2.1, source: 'fixture' },
      { date: '2026-07-16', nav: 1.2, accumulatedNav: 2.2, source: 'fixture' },
    ], controls, 'day', 'fixed-nonce', { scriptUri: 'chart.js', cspSource: 'chart-source' });

    expect(html).toContain('data-echart="fund-nav-chart-option"');
    expect(html).toContain('"name":"单位净值"');
    expect(html).toContain('src="chart.js"');
    expect(html).toContain('区间涨跌');
  });
});
