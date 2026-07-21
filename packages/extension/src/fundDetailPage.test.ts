import { describe, expect, it } from 'vitest';
import { renderFundDetailPage } from './fundDetailPage';

describe('fund extended detail page', () => {
  it('renders all structured sections without remote scripts', () => {
    const html = renderFundDetailPage({
      code: '001632', name: '<Example Fund>', fundType: 'Index', riskLevel: 'Medium-high risk',
      sizeCny: 3_985_000_000, sizeDate: '2026-03-31', manager: 'Manager',
      establishedDate: '2015-07-29', managementCompany: 'Company', ratingStars: 2,
      trackingTarget: 'Index target', annualTrackingErrorRatio: 0.0125,
      returns: { month: 0.0096, year: -0.1568 },
      profitProbability: { week: 0.4085, year: 0.2567 }, overallScore: 79.68, fundScore: 7.975,
      institutionRatings: [{ date: '2026-03-31', merchantSecurities: 4 }],
      similarFunds: [{ code: '008326', name: 'Peer', period: '1Y', returnRatio: 0.216 }],
      holdings: [{ code: '600519', name: 'Moutai', navRatio: 0.099, sharesWan: 1, marketValueWan: 2, reportDate: '2026-03-31' }],
    });
    expect(html).toContain('&lt;Example Fund&gt;');
    expect(html).toContain('39.85 B CNY');
    expect(html).toContain('盈利概率');
    expect(html).toContain('机构评级');
    expect(html).toContain('同类基金');
    expect(html).toContain('主要持仓 (2026-03-31)');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('https://');
  });
});
