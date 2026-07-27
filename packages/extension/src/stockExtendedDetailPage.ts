export function renderIwenCaiTokenPage(title: string, moduleUri: string, cspSource: string, nonce: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${escapeHtml(cspSource)};"><style>:root{color-scheme:light dark}body{display:grid;place-items:center;min-height:100vh;margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}p{color:var(--vscode-descriptionForeground)}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>正在加载股票诊断...</p></main><script type="module" nonce="${nonce}">import {getHexinToken} from ${JSON.stringify(moduleUri)};const vscode=acquireVsCodeApi();try{vscode.postMessage({command:'iwencaiToken',token:getHexinToken()});}catch(error){vscode.postMessage({command:'iwencaiTokenError',message:String(error)});}</script></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
