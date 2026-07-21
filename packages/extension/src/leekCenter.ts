import { env, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { getLeekCenterPage, LeekCenterWatchlistData, renderLeekCenterHtml } from './leekCenterPages';
import { getEastMoneyProxy } from './eastMoneyProxy';

let panel: WebviewPanel | undefined;
let activeOptions: LeekCenterOptions | undefined;

export interface LeekCenterOptions {
  extensionUri: Uri;
  watchlist: LeekCenterWatchlistData;
  refreshWatchlist?: () => Promise<LeekCenterWatchlistData>;
  openWatchlistDetails?: (kind: 'stock' | 'fund', code: string, name: string) => Promise<void> | void;
  loadStockDetails?: (code: string, name: string, token?: string) => Promise<string>;
}

export async function updateLeekCenterWatchlist(data: LeekCenterWatchlistData): Promise<void> {
  if (!activeOptions) return;
  activeOptions = { ...activeOptions, watchlist: data };
  await panel?.webview.postMessage({ command: 'watchlistData', data });
}

export async function showLeekCenter(initialPageId?: string, options?: LeekCenterOptions): Promise<void> {
  const requestedPage = initialPageId && getLeekCenterPage(initialPageId) ? initialPageId : undefined;
  if (options) activeOptions = options;
  let proxy;
  try {
    proxy = await getEastMoneyProxy();
  } catch (error) {
    void window.showErrorMessage(`Could not start the local EastMoney service: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (panel) {
    panel.reveal(ViewColumn.One);
    if (requestedPage) panel.webview.html = renderHtml(panel, requestedPage, proxy.origin);
    return;
  }
  panel = window.createWebviewPanel(
    'stockFundLeekCenter',
    'Leek Center',
    ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      portMapping: [{ webviewPort: proxy.port, extensionHostPort: proxy.port }],
      localResourceRoots: [Uri.joinPath(activeOptions?.extensionUri ?? Uri.file(''), 'assets')],
    }
  );
  panel.webview.html = renderHtml(panel, requestedPage, proxy.origin);
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    if (isOpenExternalMessage(message)) {
      const page = getLeekCenterPage(message.pageId);
      if (page) await env.openExternal(Uri.parse(page.url));
      return;
    }
    if (isRefreshWatchlistMessage(message) && activeOptions?.refreshWatchlist) {
      const data = await activeOptions.refreshWatchlist();
      activeOptions = { ...activeOptions, watchlist: data };
      await panel?.webview.postMessage({ command: 'watchlistData', data });
      return;
    }
    if (isOpenWatchlistDetailsMessage(message)) {
      await activeOptions?.openWatchlistDetails?.(message.kind, message.code, message.name);
      return;
    }
    if (isLoadStockDetailsMessage(message) && activeOptions?.loadStockDetails) {
      try {
        const html = await activeOptions.loadStockDetails(message.code, message.name, message.token);
        await panel?.webview.postMessage({ command: 'watchlistStockDetails', key: message.key, html });
      } catch (error) {
        await panel?.webview.postMessage({
          command: 'watchlistStockDetails', key: message.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
  panel.onDidDispose(() => { panel = undefined; activeOptions = undefined; });
}

function renderHtml(current: WebviewPanel, requestedPage: string | undefined, eastMoneyOrigin: string): string {
  const tokenModuleUri = current.webview.asWebviewUri(Uri.joinPath(activeOptions?.extensionUri ?? Uri.file(''), 'assets', 'hexin-v.js')).toString();
  return renderLeekCenterHtml(
    createNonce(), requestedPage, eastMoneyOrigin, activeOptions?.watchlist, tokenModuleUri, current.webview.cspSource
  );
}

function isRefreshWatchlistMessage(value: unknown): value is { command: 'refreshWatchlist' } {
  return Boolean(value && typeof value === 'object' && (value as { command?: unknown }).command === 'refreshWatchlist');
}

function isOpenWatchlistDetailsMessage(value: unknown): value is {
  command: 'openWatchlistDetails'; kind: 'stock' | 'fund'; code: string; name: string;
} {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.command === 'openWatchlistDetails'
    && (message.kind === 'stock' || message.kind === 'fund')
    && typeof message.code === 'string'
    && typeof message.name === 'string';
}

function isLoadStockDetailsMessage(value: unknown): value is {
  command: 'loadWatchlistStockDetails'; key: string; code: string; name: string; token?: string;
} {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.command === 'loadWatchlistStockDetails'
    && typeof message.key === 'string'
    && typeof message.code === 'string'
    && typeof message.name === 'string'
    && (message.token === undefined || typeof message.token === 'string');
}

function isOpenExternalMessage(value: unknown): value is { command: 'openExternal'; pageId: string } {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.command === 'openExternal' && typeof message.pageId === 'string';
}

function createNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}
