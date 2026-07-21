import { describe, expect, it } from 'vitest';
import { getLeekCenterPage, LEEK_CENTER_PAGES, LEEK_CENTER_TABS, renderLeekCenterHtml } from './leekCenterPages';

describe('Leek Center pages', () => {
  it('uses unique IDs and HTTPS allowlisted URLs', () => {
    expect(new Set(LEEK_CENTER_PAGES.map(({ id }) => id)).size).toBe(LEEK_CENTER_PAGES.length);
    for (const page of LEEK_CENTER_PAGES) expect(new URL(page.url).protocol).toBe('https:');
  });

  it('renders a strict frame allowlist and no arbitrary proxy', () => {
    const html = renderLeekCenterHtml('nonce');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('frame-src ');
    expect(html).toContain('https://quote.eastmoney.com');
    expect(html).toContain('https://emrnweb.eastmoney.com');
    expect(html).toContain('https://emdatah5.eastmoney.com');
    expect(html).not.toContain('http://localhost');
    expect(getLeekCenterPage('dragon-tiger')?.title).toBe('龙虎榜');
    expect(renderLeekCenterHtml('nonce', 'northbound-flow')).toContain('let current="northbound-flow"');
  });

  it('opens the restored market page by default with Chinese navigation and titles', () => {
    const html = renderLeekCenterHtml('nonce', undefined, 'http://127.0.0.1:16100');
    expect(html).toContain('let current="bull-bear"');
    expect(html).toContain('选股通盯盘');
    expect(html).toContain('行情中心');
    expect(html).toContain('刷新');
    expect(html).toContain('http://127.0.0.1:16100/zhuti/#ggfxb');
  });

  it('routes Stock Wind Vane through the local EastMoney proxy', () => {
    const html = renderLeekCenterHtml('nonce', 'wind-vane', 'http://127.0.0.1:16100');
    expect(html).toContain('http://127.0.0.1:16100/zhuti/#ggfxb');
    expect(html).toMatch(/frame-src [^;]*http:\/\/127\.0\.0\.1:16100/);
    expect(html).not.toContain('https://quote.eastmoney.com/zhuti/#ggfxb');
  });

  it('renders extensible top tabs and the current stock and fund watchlist', () => {
    const html = renderLeekCenterHtml('nonce', undefined, 'https://quote.eastmoney.com', {
      stocks: [{ name: '股票自选', items: [{
        code: 'sh600000', name: '浦发银行<script>', market: 'sh', price: 10.25,
        previousClose: 10, open: 10.1, high: 10.5, low: 9.98, change: 0.25,
        changeRatio: 0.025, source: 'stock-api', status: 'live',
      }] }],
      funds: [{ name: '基金自选', items: [{
        code: '001632', name: '天弘中证食品饮料ETF', nav: 1.8222, accumulatedNav: 2.1,
        navDate: '2026-07-20', navChangeRatio: 0.0306, source: 'fund-api', status: 'live',
      }] }],
      updatedAt: 1,
    });
    expect(LEEK_CENTER_TABS.map(({ id }) => id)).toEqual(['data-center', 'watchlist']);
    expect(html).toContain('data-tab="data-center"');
    expect(html).toContain('data-tab="watchlist"');
    expect(html).toContain('我的自选');
    expect(html).toContain("command:'loadWatchlistStockDetails'");
    expect(html).toContain('正在加载股票详情...');
    expect(html).toContain('class="stock-extended"');
    expect(html).toContain('.tab-panel{display:none;width:100%;height:100%;min-height:0;overflow:hidden}');
    expect(html).toContain('.watch-detail{width:100%;height:100%;min-width:0;min-height:0;overflow-x:auto;overflow-y:auto');
    expect(html).toContain('浦发银行\\u003cscript>');
    expect(html).toContain('天弘中证食品饮料ETF');
    expect(html).not.toContain('浦发银行<script>');
  });

  it('loads the same iWencai token module used by the standalone stock details page', () => {
    const html = renderLeekCenterHtml(
      'fixed', undefined, 'https://quote.eastmoney.com', undefined,
      'vscode-webview://id/assets/hexin-v.js', 'vscode-webview://id'
    );
    expect(html).toContain("script-src 'nonce-fixed' vscode-webview://id");
    expect(html).toContain('import {getHexinToken} from "vscode-webview://id/assets/hexin-v.js";');
    expect(html).toContain('token=getHexinToken()');
  });
});
