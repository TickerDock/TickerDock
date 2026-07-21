export type StockChartMode = 'standard' | 'chips';

export interface StockIframeTargets {
  standard: string;
  chips?: string;
}

export function buildStockIframeTargets(
  code: string,
  eastMoneyOrigin = 'https://quote.eastmoney.com'
): StockIframeTargets {
  const normalized = code.trim().toLowerCase();
  const sector = /^bk\d{4}$/.exec(normalized);
  if (sector) {
    return { standard: `${eastMoneyOrigin}/basic/full.html?mcid=90.${sector[0].toUpperCase()}&type=r` };
  }
  const future = /^(?:nf_|hf_)([a-z0-9]+)$/i.exec(normalized);
  if (future) {
    return { standard: `https://finance.sina.com.cn/futures/quotes/${future[1]!.toUpperCase()}.shtml` };
  }

  const mainland = /^(sh|sz|bj)(\d{6})$/.exec(normalized);
  if (mainland) {
    const [, market, digits] = mainland;
    const marketId = market === 'sh' ? '1' : '0';
    const standard = `${eastMoneyOrigin}/basic/full.html?mcid=${marketId}.${digits}`;
    const supportsChips = (market === 'sh' && !digits!.startsWith('000'))
      || (market === 'sz' && !digits!.startsWith('399'));
    return {
      standard,
      chips: supportsChips
        ? `${eastMoneyOrigin}/basic/h5chart-iframe.html?code=${digits}&market=${marketId}`
        : undefined,
    };
  }

  const hongKong = /^hk(\d{5})$/.exec(normalized);
  if (hongKong) {
    return { standard: `${eastMoneyOrigin}/basic/full.html?mcid=116.${hongKong[1]}` };
  }

  const us = /^(?:usr_|gb_)([a-z0-9.^-]{1,20})$/i.exec(normalized);
  if (us) {
    return { standard: `${eastMoneyOrigin}/basic/full.html?mcid=105.${encodeURIComponent(us[1]!.toUpperCase())}` };
  }

  throw new Error(`Unsupported stock trend code: ${code}`);
}

export function renderStockIframePage(
  title: string,
  targets: StockIframeTargets,
  requestedMode: StockChartMode,
  nonce: string
): string {
  const mode: StockChartMode = requestedMode === 'chips' && targets.chips ? 'chips' : 'standard';
  const source = mode === 'chips' ? targets.chips! : targets.standard;
  const frameOrigins = [...new Set(
    [targets.standard, targets.chips].filter((url): url is string => Boolean(url)).map((url) => new URL(url).origin)
  )].join(' ');
  const controls = targets.chips
    ? `<nav class="segments" aria-label="股票图表模式"><button type="button" data-mode="standard"${mode === 'standard' ? ' aria-pressed="true"' : ''}>标准行情</button><button type="button" data-mode="chips"${mode === 'chips' ? ' aria-pressed="true"' : ''}>筹码分布</button></nav>`
    : '';
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-src ${frameOrigins};"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);overflow:hidden}.shell{display:grid;grid-template-rows:52px minmax(0,1fr);height:100vh}header{display:flex;align-items:center;gap:16px;padding:0 14px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editorGroupHeader-tabsBackground)}h1{min-width:0;flex:1;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px}.segments{display:flex;border:1px solid var(--vscode-panel-border)}button{height:30px;padding:0 10px;border:0;border-right:1px solid var(--vscode-panel-border);border-radius:0;color:var(--vscode-foreground);background:transparent;cursor:pointer}button:last-child{border-right:0}button[aria-pressed=true]{color:var(--vscode-button-foreground);background:var(--vscode-button-background)}iframe{display:block;width:100%;height:100%;border:0;background:white}@media(max-width:620px){header{gap:8px;padding:0 8px}h1{font-size:14px}.segments{flex-shrink:0}button{padding:0 7px}}
  </style></head><body><main class="shell"><header><h1>${escapeHtml(title)}</h1>${controls}</header><iframe src="${escapeHtml(source)}" title="${escapeHtml(title)}" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></main><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('[data-mode]').forEach((button)=>button.addEventListener('click',()=>vscode.postMessage({command:'changeStockChartMode',mode:button.dataset.mode})));</script></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}
