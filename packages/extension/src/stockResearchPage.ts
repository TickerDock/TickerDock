import { StockResearchItem } from '@stock-fund/domain';

export function renderStockResearchPage(name: string, items: readonly StockResearchItem[]): string {
  const content = items.length === 0
    ? '<p class="empty">暂无相关韭研公社研报。</p>'
    : items.map((item) => {
      const url = trustedResearchUrl(item.url);
      return `<article>
        <header><h2>${escapeHtml(item.title)}</h2><span>${escapeHtml(item.time)}</span></header>
        <p>${escapeHtml(item.summary.slice(0, 1800))}</p>
        ${url ? `<a href="${escapeHtml(url)}">打开原文</a>` : ''}
      </article>`;
    }).join('');
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>
    :root{color-scheme:light dark}body{max-width:960px;margin:0 auto;padding:20px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}h1{margin:0 0 18px;font-size:20px}article{padding:16px 0;border-top:1px solid var(--vscode-panel-border)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}h2{margin:0;font-size:15px;line-height:1.45}header span{flex:0 0 auto;color:var(--vscode-descriptionForeground);font-size:12px}p{margin:9px 0;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}a{color:var(--vscode-textLink-foreground)}.empty{color:var(--vscode-descriptionForeground)}@media(max-width:640px){header{display:block}header span{display:block;margin-top:4px}}
  </style></head><body><h1>${escapeHtml(name)} 研报</h1>${content}</body></html>`;
}

export function renderStockResearchError(name: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return renderStockResearchPage(name, [{
    id: 'error', title: '研报暂不可用', summary: message, time: '',
    source: 'jiuyangongshe', url: 'https://www.jiuyangongshe.com/',
  }]);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function trustedResearchUrl(value: string): string | undefined {
  return /^https:\/\/www\.jiuyangongshe\.com\/a\/[a-zA-Z0-9_-]+$/.test(value) ? value : undefined;
}
