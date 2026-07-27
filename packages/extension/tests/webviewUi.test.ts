import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  Uri: {
    joinPath: (base: { path: string }, ...parts: string[]) => ({ path: [base.path, ...parts].join('/') }),
  },
}));

import { postWebviewMessage, readWebviewEnvelope, renderWebviewUi } from '../src/webviewUi';

const extensionUri = { path: '/extension' } as never;
const webview = {
  cspSource: 'vscode-webview://test',
  asWebviewUri: ({ path }: { path: string }) => ({ toString: () => `webview:${path}` }),
  postMessage: vi.fn(async () => true),
} as never;

describe('shared React webview host', () => {
  it('allows only the active stock proxy origin in frame-src', () => {
    const html = renderWebviewUi(webview, extensionUri, {
      page: 'stockMarketFrame',
      title: '昨日涨停',
      targets: {
        standard: 'http://127.0.0.1:16100/basic/full.html?mcid=90.BK0815&type=r',
        chips: 'http://127.0.0.1:16100/basic/h5chart-iframe.html?code=600519&market=1',
      },
      mode: 'standard',
    });

    expect(html).toContain('frame-src http://127.0.0.1:16100;');
    expect(html.match(/frame-src http:\/\/127\.0\.0\.1:16100;/g)).toHaveLength(1);
    expect(html).not.toContain('https://quote.eastmoney.com');
  });

  it('derives frame origins for Binance and Leek Center without adding connect-src access', () => {
    const binanceHtml = renderWebviewUi(webview, extensionUri, {
      page: 'binanceFrame', title: 'BTC/USDT', source: 'https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT',
    });
    const leekHtml = renderWebviewUi(webview, extensionUri, {
      page: 'leekCenter',
      pages: [
        { id: 'one', title: '一', description: '', group: 'Market', url: 'https://example.com/a' },
        { id: 'two', title: 'two', description: '', group: 'Research', url: 'https://example.com/b' },
        { id: 'three', title: 'three', description: '', group: 'Market', url: 'http://127.0.0.1:16100/c' },
      ],
      initialPageId: 'one',
      watchlist: { stocks: [], funds: [], updatedAt: 1 },
    });

    expect(binanceHtml).toContain('frame-src https://www.tradingview.com;');
    expect(leekHtml).toContain('frame-src https://example.com http://127.0.0.1:16100;');
    expect(leekHtml).toContain("connect-src 'none';");
  });

  it('escapes bootstrap and token module values in script contexts', () => {
    const html = renderWebviewUi(webview, extensionUri, {
      page: 'aiResult', title: '</script><script>alert(1)</script>', result: '<unsafe>',
    }, { tokenModuleUri: 'webview:/assets/<module>.js' });

    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain('\\u003c/script>');
    expect(html).toContain('webview:/assets/\\u003cmodule>.js');
  });

  it('posts and reads versioned message envelopes', async () => {
    await postWebviewMessage(webview, 'saved', { ok: true });
    const sent = vi.mocked((webview as { postMessage: typeof vi.fn }).postMessage).mock.calls.at(-1)?.[0] as unknown as Record<string, unknown>;

    expect(sent).toMatchObject({ version: 1, type: 'saved', payload: { ok: true } });
    expect(typeof sent.requestId).toBe('string');
    expect(readWebviewEnvelope(sent, 'saved')).toEqual({ ok: true });
    expect(readWebviewEnvelope({ ...sent, version: 2 }, 'saved')).toBeUndefined();
  });
});


