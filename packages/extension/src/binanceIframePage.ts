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

export function renderBinanceIframePage(title: string, source: string): string {
  const parsed = new URL(source);
  if (parsed.origin !== 'https://s.tradingview.com' || parsed.pathname !== '/widgetembed/') {
    throw new Error('Unsupported Binance iframe source.');
  }
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src https://s.tradingview.com;"><style>
    *{box-sizing:border-box}html,body,main,iframe{width:100%;height:100%;margin:0}body{overflow:hidden;background:var(--vscode-editor-background)}iframe{display:block;border:0}
  </style></head><body><main><iframe id="stock-fund-binance-chart" src="${escapeHtml(parsed.toString())}" title="${escapeHtml(title)}" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen" allowfullscreen></iframe></main></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}
