import { describe, expect, it } from 'vitest';
import { renderFundOverviewPage } from './fundOverviewPage';

describe('fund overview page', () => {
  it('renders searchable funds, estimates, local history, and nonce-only scripts', () => {
    const html = renderFundOverviewPage({
      funds: [{
        code: '001632', name: '<Fund>', nav: 1.2, accumulatedNav: 1.8,
        navDate: '2026-07-16', navChangeRatio: 0.01, estimatedNav: 1.22,
        estimatedChangeRatio: 0.02, estimateTime: '2026-07-17 14:30', source: 'fund-api', status: 'live',
      }],
      selectedCode: '001632', range: '1y', loading: false,
      history: [
        { date: '2026-01-01', nav: 1, accumulatedNav: 1.5, source: 'fixture' },
        { date: '2026-07-16', nav: 1.2, accumulatedNav: 1.8, source: 'fixture' },
      ],
    }, 'fixed', { scriptUri: 'chart.js', cspSource: 'chart-source' });
    expect(html).toContain("script-src 'nonce-fixed'");
    expect(html).toContain('data-fund="001632"');
    expect(html).toContain('估算净值');
    expect(html).toContain('+20.00%');
    expect(html).toContain('data-echart="fund-overview-chart-option"');
    expect(html).toContain('src="chart.js"');
    expect(html).toContain('&lt;Fund&gt;');
    expect(html).not.toMatch(/https?:\/\//);
  });
});
