import { randomBytes } from 'node:crypto';
import { ProgressLocation, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { StockGateway, StockIwenCaiGateway, StockResearchGateway } from '@stock-fund/domain';
import { renderIwenCaiTokenPage } from './stockExtendedDetailPage';
import { loadStockExtendedDetail } from './stockExtendedDetailLoader';
import { renderWebviewUi, webviewUiRoot } from './webviewUi';

let panel: WebviewPanel | undefined;
let requestVersion = 0;
let pendingToken: { resolve: (token: string | undefined) => void; timer: NodeJS.Timeout } | undefined;

export async function showStockExtendedDetails(
  stockGateway: StockGateway,
  researchGateway: StockResearchGateway,
  iwencaiGateway: StockIwenCaiGateway,
  extensionUri: Uri,
  code: string,
  name = code
): Promise<void> {
  const title = `${name} Stock Details`;
  const current = acquirePanel(title, extensionUri);
  const version = ++requestVersion;
  try {
    const supportsIwenCai = /^(?:sh|sz|bj)\d{6}$/i.test(code);
    const hexinToken = supportsIwenCai ? await requestIwenCaiToken(current, title, extensionUri) : undefined;
    if (panel !== current || version !== requestVersion) return;
    current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'stockExtendedDetail', title });
    const detail = await window.withProgress(
      { location: ProgressLocation.Notification, title: `Loading ${name} stock details...` },
      () => loadStockExtendedDetail(stockGateway, researchGateway, iwencaiGateway, code, name, hexinToken)
    );
    if (panel === current && version === requestVersion) current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'stockExtendedDetail', title, detail });
  } catch (error) {
    if (panel === current && version === requestVersion) current.webview.html = renderWebviewUi(current.webview, extensionUri, {
      page: 'stockExtendedDetail', title, error: error instanceof Error ? error.message : String(error),
    });
  }
}

function acquirePanel(title: string, extensionUri: Uri): WebviewPanel {
  if (panel) {
    panel.title = title;
    panel.reveal(ViewColumn.One);
    return panel;
  }
  const created = window.createWebviewPanel('stockFundExtendedStockDetail', title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [Uri.joinPath(extensionUri, 'assets'), webviewUiRoot(extensionUri)],
  });
  panel = created;
  created.onDidDispose(() => {
    if (panel !== created) return;
    panel = undefined;
    requestVersion += 1;
    clearPendingToken();
  });
  created.webview.onDidReceiveMessage((message: unknown) => {
    if (!pendingToken || !isTokenMessage(message)) return;
    const token = message.command === 'iwencaiToken' && validToken(message.token) ? message.token : undefined;
    const pending = pendingToken;
    pendingToken = undefined;
    clearTimeout(pending.timer);
    pending.resolve(token);
  });
  return created;
}

function requestIwenCaiToken(current: WebviewPanel, title: string, extensionUri: Uri): Promise<string | undefined> {
  clearPendingToken();
  const moduleUri = current.webview.asWebviewUri(Uri.joinPath(extensionUri, 'assets', 'hexin-v.js')).toString();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pendingToken?.timer !== timer) return;
      pendingToken = undefined;
      resolve(undefined);
    }, 8000);
    pendingToken = { resolve, timer };
    current.webview.html = renderIwenCaiTokenPage(
      title,
      moduleUri,
      current.webview.cspSource,
      randomBytes(16).toString('base64url')
    );
  });
}

function clearPendingToken(): void {
  if (!pendingToken) return;
  const pending = pendingToken;
  pendingToken = undefined;
  clearTimeout(pending.timer);
  pending.resolve(undefined);
}

function isTokenMessage(value: unknown): value is { command: 'iwencaiToken' | 'iwencaiTokenError'; token?: string } {
  if (!value || typeof value !== 'object') return false;
  const command = (value as { command?: unknown }).command;
  return command === 'iwencaiToken' || command === 'iwencaiTokenError';
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 16 && value.length <= 2048 && /^[\x21-\x7e]+$/.test(value);
}
