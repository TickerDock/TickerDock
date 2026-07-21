import { describe, expect, it } from 'vitest';
import { renderFundPositionManagerPage, renderStockPositionManagerPage } from './positionManagerPage';

describe('position manager page', () => {
  it('renders stock fields with escaped labels and nonce-only scripts', () => {
    const html = renderStockPositionManagerPage(
      [{ code: 'sh600000', name: '<Bank>' }],
      new Map([['sh600000', { code: 'sh600000', quantity: 100, costPrice: 10, soldOut: false }]]),
      'fixed'
    );
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-fixed'");
    expect(html).toContain('name="quantity"');
    expect(html).toContain('name="todayTradePrice"');
    expect(html).toContain('&lt;Bank&gt;');
    expect(html).toContain('.table-wrap{height:calc(100vh - var(--toolbar-height));overflow:auto}');
    expect(html).toContain('th{position:sticky;top:0');
    expect(html).not.toContain('th{top:54px');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('renders fund shares and cost NAV fields', () => {
    const html = renderFundPositionManagerPage(
      [{ code: '110022', name: 'Fund' }],
      new Map([['110022', { code: '110022', shares: 1000, costNav: 1.5 }]]),
      'fixed'
    );
    expect(html).toContain('name="shares"');
    expect(html).toContain('name="costNav"');
    expect(html).toContain('saveFundPositions');
  });
});
