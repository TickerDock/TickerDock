import { randomBytes } from 'node:crypto';
import { Uri, Webview } from 'vscode';
import { WEBVIEW_PROTOCOL_VERSION } from './webviewProtocol';
export { readWebviewEnvelope, WEBVIEW_PROTOCOL_VERSION } from './webviewProtocol';

export type WebviewBootstrap =
  | { page: 'sectorManager'; sectors: Array<{ code: string; name: string }> }
  | { page: 'stockPositions'; items: Array<{ code: string; name: string }>; positions: unknown[] }
  | { page: 'fundPositions'; items: Array<{ code: string; name: string }>; positions: unknown[] }
  | { page: 'personalization'; state: unknown; defaults: unknown }
  | { page: 'aiSettings'; state: unknown }
  | { page: 'stockResearch'; name: string; items?: unknown[] }
  | { page: 'fundDetail'; title: string; detail?: unknown; error?: string }
  | { page: 'fundHoldings'; code: string; name: string; items?: unknown[]; error?: string }
  | { page: 'fundRanking'; items?: unknown[]; error?: string }
  | { page: 'fundFlows'; industry?: unknown[]; concept?: unknown[]; region?: unknown[]; error?: string }
  | { page: 'stockExtendedDetail'; title: string; detail?: unknown; error?: string }
  | { page: 'marketSentiment'; snapshot?: unknown; error?: string }
  | { page: 'fundComparison'; series?: unknown[]; failedCodes: string[]; controls: ReadonlyArray<{ id: string; label: string }>; active: string; error?: string }
  | { page: 'fundOverview'; funds: unknown[]; selectedCode: string; history: unknown[]; range: string; loading: boolean; error?: string }
  | { page: 'fundTrend'; title: string; data?: unknown[]; controls: ReadonlyArray<{ id: string; label: string }>; active: string; error?: string }
  | { page: 'stockKline'; title: string; code: string; data?: unknown[]; controls: ReadonlyArray<{ id: string; label: string }>; active: string; error?: string }
  | { page: 'stockMarketFrame'; title: string; targets?: { standard: string; chips?: string }; mode: 'standard' | 'chips'; error?: string }
  | { page: 'binanceFrame'; title: string; source: string }
  | { page: 'aiResult'; title: string; result: string }
  | { page: 'leekCenter'; pages: Array<{ id: string; title: string; description: string; group: string; url: string }>; initialPageId: string; watchlist: unknown };

export function webviewUiRoot(extensionUri: Uri): Uri {
  return Uri.joinPath(extensionUri, 'dist', 'webview-ui');
}

export function renderWebviewUi(webview: Webview, extensionUri: Uri, bootstrap: WebviewBootstrap, options: { tokenModuleUri?: string } = {}): string {
  const root = webviewUiRoot(extensionUri);
  const scriptUri = webview.asWebviewUri(Uri.joinPath(root, 'webview.js'));
  const styleUri = webview.asWebviewUri(Uri.joinPath(root, 'webview.css'));
  const nonce = randomBytes(18).toString('base64url');
  const data = JSON.stringify(bootstrap).replace(/</g, '\\u003c');
  const frameTargets = bootstrap.page === 'stockMarketFrame' && bootstrap.targets
    ? [bootstrap.targets.standard, bootstrap.targets.chips]
    : bootstrap.page === 'binanceFrame' ? [bootstrap.source] : bootstrap.page === 'leekCenter' ? bootstrap.pages.map(({ url }) => url) : [];
  const frameSources = [...new Set(frameTargets.filter((value): value is string => Boolean(value)).map((value) => new URL(value).origin))];
  const framePolicy = frameSources.length ? ` frame-src ${frameSources.join(' ')};` : '';
  const tokenBootstrap = options.tokenModuleUri ? `<script nonce="${nonce}" type="module">import {getHexinToken} from ${serializeScriptValue(options.tokenModuleUri)};window.__TICKERDOCK_GET_HEXIN_TOKEN__=getHexinToken;</script>` : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; connect-src 'none';${framePolicy}"><link rel="stylesheet" href="${styleUri}"><title>TickerDock</title></head><body><div id="root"></div><script nonce="${nonce}">window.__TICKERDOCK_BOOTSTRAP__=${data};</script>${tokenBootstrap}<script nonce="${nonce}" type="module" src="${scriptUri}"></script></body></html>`;
}

function serializeScriptValue(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function postWebviewMessage(webview: Webview, type: string, payload: unknown): Thenable<boolean> {
  return webview.postMessage({
    version: WEBVIEW_PROTOCOL_VERSION,
    type,
    requestId: randomBytes(12).toString('base64url'),
    payload,
  });
}
