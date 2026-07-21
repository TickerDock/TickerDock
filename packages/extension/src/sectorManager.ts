import { randomBytes } from 'node:crypto';
import { ViewColumn, window } from 'vscode';
import { ConfigRepository, Sector } from './configRepository';

export function showSectorManager(config: ConfigRepository, onSaved: (sectors: Sector[]) => void): void {
  const panel = window.createWebviewPanel('stockFundSectors', '板块管理', ViewColumn.One, { enableScripts: true });
  const nonce = randomBytes(18).toString('base64url');
  panel.webview.html = render(config.getSectors(), nonce);
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    if (!message || typeof message !== 'object' || (message as any).command !== 'save') return;
    const sectors = (message as any).sectors;
    if (!Array.isArray(sectors)) return;
    const valid = sectors.filter((item): item is Sector => item && /^BK\d{4}$/.test(String(item.code).trim().toUpperCase()) && String(item.name).trim())
      .map((item) => ({ code: String(item.code).trim().toUpperCase(), name: String(item.name).trim() }));
    await config.setSectors(valid);
    onSaved(config.getSectors());
    panel.dispose();
  });
}

function render(sectors: readonly Sector[], nonce: string): string {
  const rows = sectors.map((item) => `<tr><td><input name="code" value="${escapeHtml(item.code)}" pattern="BK\\d{4}" required></td><td><input name="name" value="${escapeHtml(item.name)}" required></td><td><button type="button" class="remove">删除</button></td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';script-src 'nonce-${nonce}'"><style>body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px}h1{font-size:18px}table{border-collapse:collapse;width:100%;max-width:760px}td,th{padding:8px;border-bottom:1px solid var(--vscode-panel-border);text-align:left}input{padding:6px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border)}button{padding:6px 12px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;cursor:pointer}.toolbar{display:flex;gap:8px;margin:14px 0}</style></head><body><h1>板块管理</h1><form id="form"><table><thead><tr><th>代码</th><th>名称</th><th></th></tr></thead><tbody id="rows">${rows}</tbody></table><div class="toolbar"><button type="button" id="add">添加板块</button><button type="submit">保存</button></div></form><script nonce="${nonce}">const vscode=acquireVsCodeApi(),rows=document.getElementById('rows');function add(code='',name=''){const tr=document.createElement('tr');tr.innerHTML='<td><input name="code" pattern="BK\\\\d{4}" required value="'+code+'"></td><td><input name="name" required value="'+name+'"></td><td><button type="button" class="remove">删除</button></td>';tr.querySelector('.remove').onclick=()=>tr.remove();rows.appendChild(tr)}document.querySelectorAll('.remove').forEach(b=>b.onclick=()=>b.closest('tr').remove());document.getElementById('add').onclick=()=>add();document.getElementById('form').onsubmit=e=>{e.preventDefault();const values=[...rows.querySelectorAll('tr')].map(tr=>{const i=tr.querySelectorAll('input');return{code:i[0].value,name:i[1].value}});vscode.postMessage({command:'save',sectors:values})};</script></body></html>`;
}
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!)); }
