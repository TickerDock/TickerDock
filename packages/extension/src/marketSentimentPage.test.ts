import { describe, expect, it } from 'vitest';
import { renderMarketSentimentPage } from './marketSentimentPage';

describe('market sentiment page', () => {
  it('renders breadth, themes, and local Stock Connect charts safely', () => {
    const html = renderMarketSentimentPage({
      breadth: {
        time: '2026-07-17', rising: 100, falling: 200, unchanged: 10,
        limitUp: 5, naturalLimitUp: 4, limitDown: 3,
        distribution: { limitUp: 5, aboveFive: 10, upOneToFive: 40, upZeroToOne: 45, flat: 10, downZeroToOne: 60, downOneToFive: 100, belowFive: 37, limitDown: 3 },
      },
      hotThemes: [{ code: 'x', name: '<Theme>', changeRatio: 0.01, leadingStockCode: '600000', leadingStockName: 'Leader', leadingStockChangeRatio: 0.02 }],
      stockConnectFlow: [{ time: '10:00', shanghaiNetInflowYi: 1, shenzhenNetInflowYi: 2, northboundNetInflowYi: 3 }],
    }, 'nonce', { scriptUri: 'chart.js', cspSource: 'chart-source' });
    expect(html).toContain('牛熊风向标');
    expect(html).toContain('&lt;Theme&gt;');
    expect(html).toContain('data-echart="market-distribution-chart-option"');
    expect(html).toContain('data-echart="stock-connect-flow-chart-option"');
    expect(html).toContain('"axisLabel":{"interval":0}');
    expect(html).not.toContain('"rotate"');
    expect(html).toContain('"yAxis":{"type":"value","minInterval":1,"show":false}');
    expect(html).toContain('"label":{"show":true,"position":"top"}');
    expect(html).toContain('src="chart.js"');
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('does not present missing Stock Connect flow as zero', () => {
    const html = renderMarketSentimentPage({ hotThemes: [], stockConnectFlow: [] }, 'nonce');
    expect(html).toContain('暂无有效的沪深港通资金流数据');
  });
});
