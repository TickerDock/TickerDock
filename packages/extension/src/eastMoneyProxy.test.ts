import { describe, expect, it } from 'vitest';
import { rewriteEastMoneyText } from './eastMoneyProxy';

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
});
