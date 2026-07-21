import { describe, expect, it } from 'vitest';
import { renderFundComparisonPage } from './fundComparisonPage';

describe('fund comparison page', () => {
  it('normalizes multiple funds locally and does not load remote resources', () => {
    const html = renderFundComparisonPage([{
      code: '001', name: '<Fund A>', data: [
        { date: '2026-01-01', nav: 1, accumulatedNav: 1, source: 'fixture' },
        { date: '2026-02-01', nav: 1.1, accumulatedNav: 1.1, source: 'fixture' },
      ],
    }, {
      code: '002', name: 'Fund B', data: [
        { date: '2026-01-01', nav: 2, accumulatedNav: 2, source: 'fixture' },
        { date: '2026-02-01', nav: 1.8, accumulatedNav: 1.8, source: 'fixture' },
      ],
    }], [], [{ id: '1y', label: '1Y' }], '1y', 'nonce', { scriptUri: 'chart.js', cspSource: 'chart-source' });

    expect(html).toContain("default-src 'none'");
    expect(html).toContain('data-echart="fund-comparison-chart-option"');
    expect(html).toContain('src="chart.js"');
    expect(html).toContain('+10.00%');
    expect(html).toContain('-10.00%');
    expect(html).toContain('&lt;Fund A&gt;');
    expect(html).not.toMatch(/https?:\/\//);
  });
});
