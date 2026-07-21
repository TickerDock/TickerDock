import { FundPosition, StockPosition } from '@stock-fund/domain';
import { PositionManagerItem } from './positionManagerModel';

export function renderStockPositionManagerPage(
  items: readonly PositionManagerItem[],
  positions: ReadonlyMap<string, StockPosition>,
  nonce: string
): string {
  const rows = items.map((item) => {
    const position = positions.get(item.code);
    return row(item, [
      numberInput('quantity', position?.quantity),
      numberInput('costPrice', position?.costPrice),
      numberInput('todayTradePrice', position?.todayTradePrice),
      `<label class="check"><input name="soldOut" type="checkbox"${position?.soldOut ? ' checked' : ''}><span>已清仓</span></label>`,
    ]);
  }).join('');
  return page('股票持仓', 'stock', ['数量', '成本价', '今日交易价', '状态'], rows, nonce);
}

export function renderFundPositionManagerPage(
  items: readonly PositionManagerItem[],
  positions: ReadonlyMap<string, FundPosition>,
  nonce: string
): string {
  const rows = items.map((item) => {
    const position = positions.get(item.code);
    return row(item, [
      numberInput('shares', position?.shares),
      numberInput('costNav', position?.costNav),
    ]);
  }).join('');
  return page('基金持仓', 'fund', ['份额', '成本净值'], rows, nonce);
}

function row(item: PositionManagerItem, cells: readonly string[]): string {
  return `<tr data-code="${escapeHtml(item.code)}" data-search="${escapeHtml(`${item.code} ${item.name}`.toLowerCase())}"><td class="asset"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.code)}</small></td>${cells.map((cell) => `<td>${cell}</td>`).join('')}<td class="actions"><button class="clear" type="button" title="清空持仓" aria-label="清空 ${escapeHtml(item.name)} 持仓">X</button></td></tr>`;
}

function numberInput(name: string, value: number | undefined): string {
  return `<input name="${name}" type="number" min="0" step="any" inputmode="decimal" value="${value === undefined ? '' : String(value)}">`;
}

function page(
  title: string,
  kind: 'stock' | 'fund',
  columns: readonly string[],
  rows: string,
  nonce: string
): string {
  const command = kind === 'stock' ? 'saveStockPositions' : 'saveFundPositions';
  const required = kind === 'stock' ? ['quantity', 'costPrice'] : ['shares', 'costNav'];
  const optional = kind === 'stock' ? ['todayTradePrice'] : [];
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><style>
    :root{color-scheme:light dark;--toolbar-height:54px}*{box-sizing:border-box}html,body{height:100%}body{margin:0;overflow:hidden;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}form{height:100vh}.toolbar{position:relative;z-index:3;display:flex;align-items:center;gap:12px;height:var(--toolbar-height);padding:8px 14px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editorGroupHeader-tabsBackground,var(--vscode-editor-background))}h1{margin:0;min-width:0;flex:1;font-size:17px}.search{width:min(300px,35vw)}input{width:100%;height:30px;padding:4px 7px;border:1px solid var(--vscode-input-border,transparent);border-radius:0;color:var(--vscode-input-foreground);background:var(--vscode-input-background);font:inherit}input:focus{outline:1px solid var(--vscode-focusBorder);outline-offset:0}.save{height:30px;padding:0 14px;border:1px solid var(--vscode-button-border,transparent);border-radius:0;color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}.save:hover{background:var(--vscode-button-hoverBackground)}.table-wrap{height:calc(100vh - var(--toolbar-height));overflow:auto}table{width:100%;min-width:${kind === 'stock' ? '860px' : '620px'};border-collapse:separate;border-spacing:0}th,td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);text-align:left}th{position:sticky;top:0;z-index:2;color:var(--vscode-descriptionForeground);background:var(--vscode-editor-background,#fff);font-size:12px;font-weight:600}.asset{width:230px}.asset strong,.asset small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset small{margin-top:2px;color:var(--vscode-descriptionForeground)}td:not(.asset):not(.actions){width:150px}.check{display:flex;align-items:center;gap:7px;min-height:30px;white-space:nowrap}.check input{width:16px;height:16px}.actions{width:48px}.clear{width:28px;height:28px;border:0;border-radius:0;color:var(--vscode-icon-foreground);background:transparent;cursor:pointer}.clear:hover{background:var(--vscode-toolbar-hoverBackground)}tr[hidden]{display:none}.empty{padding:36px 14px;color:var(--vscode-descriptionForeground)}@media(max-width:650px){:root{--toolbar-height:92px}.toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto}.search{grid-row:2;grid-column:1/-1;width:100%}}
  </style></head><body><form id="positions"><header class="toolbar"><h1>${title}</h1><input id="search" class="search" type="search" placeholder="搜索" aria-label="搜索持仓"><button class="save" type="submit">保存</button></header>${rows ? `<div class="table-wrap"><table><thead><tr><th>资产</th>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">暂无自选资产或持仓记录。</div>'}</form><script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const form=document.getElementById('positions');const rows=[...document.querySelectorAll('tbody tr')];const required=${JSON.stringify(required)};const optional=${JSON.stringify(optional)};
    document.getElementById('search').addEventListener('input',(event)=>{const query=event.target.value.trim().toLowerCase();rows.forEach((row)=>{row.hidden=query!==''&&!row.dataset.search.includes(query)})});
    rows.forEach((row)=>{row.querySelector('.clear').addEventListener('click',()=>{row.querySelectorAll('input[type=number]').forEach((input)=>{input.value='';input.setCustomValidity('')});const sold=row.querySelector('[name=soldOut]');if(sold)sold.checked=false});row.querySelectorAll('input').forEach((input)=>input.addEventListener('input',()=>input.setCustomValidity('')))});
    form.addEventListener('submit',(event)=>{event.preventDefault();const positions=[];let valid=true;for(const row of rows){const values=Object.fromEntries([...row.querySelectorAll('input[type=number]')].map((input)=>[input.name,input.value.trim()]));const hasAny=[...required,...optional].some((name)=>values[name]!=='')||Boolean(row.querySelector('[name=soldOut]')?.checked);if(!hasAny)continue;for(const name of required){const input=row.querySelector('[name='+name+']');if(values[name]===''||Number(values[name])<=0){input.setCustomValidity('必填且必须大于零。');valid=false}}if(!valid)continue;const position={code:row.dataset.code};for(const name of required){position[name]=Number(values[name])}for(const name of optional){if(values[name]!=='')position[name]=Number(values[name])}if(${JSON.stringify(kind)}==='stock')position.soldOut=Boolean(row.querySelector('[name=soldOut]').checked);positions.push(position)}if(!valid){form.reportValidity();return}vscode.postMessage({command:${JSON.stringify(command)},positions})});
  </script></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}
