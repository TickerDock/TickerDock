import { describe, expect, it } from 'vitest';
import { renderIwenCaiTokenPage, renderStockExtendedDetailPage, renderStockExtendedDetailSections } from './stockExtendedDetailPage';

describe('stock extended detail page', () => {
  it('renders derived levels, source warnings, and bounded research', () => {
    const detail = {
      code: 'sh600519', name: '<Example>', changeRatio: 0.05,
      technical: { currentPrice: 105, movingAverage20: 102, movingAverage60: 99, support: 80, resistance: 115, takeProfit: 115, stopLoss: 80, sampleSize: 60 },
      iwencai: { diagnosis: { title: 'Strong', score: 8, short: 'Up', mid: 'Flat', long: 'Up', content: '<safe>' }, concepts: [{ title: 'Consumer' }], heat: '100', takeProfit: '120', institutionReports: [] },
      research: [{ id: '1', title: 'Research', summary: '<summary>', time: '2026-07-17', source: 'test', url: 'https://example.com' }],
      unavailableSources: ['iWencai diagnosis'],
    };
    const html = renderStockExtendedDetailPage(detail);
    expect(html).toContain('&lt;Example&gt;');
    expect(html).toContain('.facts{grid-template-columns:repeat(5,minmax(0,1fr))}');
    expect(html).toContain('参考止盈');
    expect(html).toContain('iWencai diagnosis');
    expect(html).toContain('&lt;safe&gt;');
    expect(html).toContain('iWencai diagnosis');
    expect(html).toContain('&lt;summary&gt;');
    expect(html).not.toContain('<script');
    const sections = renderStockExtendedDetailSections(detail);
    expect(sections).toContain('问财诊断');
    expect(sections).not.toContain('<!doctype html>');
  });

  it('loads the local token module with a nonce and restricted CSP source', () => {
    const html = renderIwenCaiTokenPage('Details', 'vscode-webview://id/assets/hexin-v.js', 'vscode-webview://id', 'fixed');
    expect(html).toContain("script-src 'nonce-fixed' vscode-webview://id");
    expect(html).toContain('import {getHexinToken}');
    expect(html).toContain("command:'iwencaiToken'");
  });
});
