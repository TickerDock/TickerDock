import { describe, expect, it } from 'vitest';
import { buildBinanceIframeTarget } from '../src/binanceIframePage';

describe('Binance iframe page', () => {
  it('builds a fixed TradingView Binance symbol', () => {
    const target = buildBinanceIframeTarget('btc_usdt', 'dark');
    const parsed = new URL(target);
    const options = JSON.parse(decodeURIComponent(parsed.hash.slice(1))) as Record<string, string>;
    expect(parsed.searchParams.get('hideideas')).toBe('1');
    expect(parsed.searchParams.get('enabled_features')).toBe('[]');
    expect(options).toMatchObject({
      symbol: 'BINANCE:BTCUSDT', interval: 'D', theme: 'dark',
      frameElementId: 'stock-fund-binance-chart', allow_symbol_change: '1',
      hide_side_toolbar: '0', save_image: '1', studies: '[]',
      style: '1', timezone: 'Etc/UTC', withdateranges: '1',
      studies_overrides: '{}', utm_medium: 'widget', utm_campaign: 'chart',
      utm_term: 'BINANCE:BTCUSDT', 'page-uri': '__NHTTP__',
    });
  });

  it('rejects arbitrary symbols', () => {
    expect(() => buildBinanceIframeTarget('https://evil.example', 'light')).toThrow('Unsupported Binance');
    expect(() => buildBinanceIframeTarget('BTC/USDT', 'light')).toThrow('Unsupported Binance');
  });
});


