export type BinanceWidgetTheme = 'light' | 'dark';

export function buildBinanceIframeTarget(symbol: string, theme: BinanceWidgetTheme): string {
  const matched = /^([A-Z0-9]{2,12})_([A-Z0-9]{2,12})$/.exec(symbol.trim().toUpperCase());
  if (!matched) throw new Error(`Unsupported Binance trading pair: ${symbol}`);
  const tradingViewSymbol = `BINANCE:${matched[1]}${matched[2]}`;
  const target = new URL('https://s.tradingview.com/widgetembed/');
  target.search = new URLSearchParams({
    hideideas: '1',
    overrides: '{}',
    enabled_features: '[]',
    disabled_features: '[]',
    locale: 'en',
  }).toString();
  target.hash = encodeURIComponent(JSON.stringify({
    symbol: tradingViewSymbol,
    frameElementId: 'stock-fund-binance-chart',
    interval: 'D',
    hide_side_toolbar: '0',
    allow_symbol_change: '1',
    save_image: '1',
    studies: '[]',
    theme,
    style: '1',
    timezone: 'Etc/UTC',
    withdateranges: '1',
    studies_overrides: '{}',
    utm_source: 'stock-fund',
    utm_medium: 'widget',
    utm_campaign: 'chart',
    utm_term: tradingViewSymbol,
    'page-uri': '__NHTTP__',
  }));
  return target.toString();
}
