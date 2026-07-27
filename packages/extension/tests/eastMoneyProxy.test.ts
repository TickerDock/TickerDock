import { describe, expect, it } from 'vitest';
import { authenticateProxyUrl, isTrustedProxySubresource, rewriteEastMoneyText } from '../src/eastMoneyProxy';

describe('EastMoney local proxy', () => {
  it('rewrites normal, protocol-relative, and JSON-escaped quote URLs', () => {
    const origin = 'http://localhost:16100';
    const input = [
      'https://quote.eastmoney.com/basic/full.html',
      '//quote.eastmoney.com/zhuti/',
      'https:\\/\\/quote.eastmoney.com\\/basic\\/main.js',
    ].join('\n');
    const output = rewriteEastMoneyText(input, origin);
    expect(output).not.toContain('quote.eastmoney.com');
    expect(output.match(/localhost:16100/g)).toHaveLength(3);
  });

  it('removes an embedded CSP meta tag from proxied HTML', () => {
    const html = '<head><meta http-equiv="Content-Security-Policy" content="frame-ancestors none"><title>Quote</title></head>';
    expect(rewriteEastMoneyText(html, 'http://localhost:16100')).toBe('<head><title>Quote</title></head>');
  });

  it('adds an unguessable proxy token only to local proxy URLs', () => {
    const proxy = { origin: 'http://localhost:16100', port: 16100, token: 'test-token' };
    expect(authenticateProxyUrl('http://localhost:16100/basic/full.html?mcid=1.600519#chart', proxy))
      .toBe('http://localhost:16100/basic/full.html?mcid=1.600519&__stock_fund_token=test-token#chart');
    expect(authenticateProxyUrl('https://finance.sina.com.cn/example', proxy)).toBe('https://finance.sina.com.cn/example');
  });

  it('accepts only browser-verified same-origin proxy subresources', () => {
    expect(isTrustedProxySubresource({
      'sec-fetch-site': 'same-origin', referer: 'http://localhost:16100/basic/full.html',
    }, 'http://localhost:16100')).toBe(true);
    expect(isTrustedProxySubresource({
      'sec-fetch-site': 'cross-site', referer: 'https://evil.example/',
    }, 'http://localhost:16100')).toBe(false);
  });
});


