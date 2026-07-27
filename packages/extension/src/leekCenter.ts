import { env, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import type { StockExtendedDetail } from '@stock-fund/domain';
import { getLeekCenterPage, LEEK_CENTER_PAGES, LeekCenterWatchlistData } from './leekCenterPages';
import { getEastMoneyProxy } from './eastMoneyProxy';
import { postWebviewMessage, readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

let panel: WebviewPanel | undefined;
let activeOptions: LeekCenterOptions | undefined;

export interface LeekCenterOptions {
  extensionUri: Uri;
  watchlist: LeekCenterWatchlistData;
  refreshWatchlist?: () => Promise<LeekCenterWatchlistData>;
  openWatchlistDetails?: (kind: 'stock' | 'fund', code: string, name: string) => Promise<void> | void;
  loadStockDetails?: (code: string, name: string, token?: string) => Promise<StockExtendedDetail>;
}

export async function updateLeekCenterWatchlist(data: LeekCenterWatchlistData): Promise<void> {
  if (!activeOptions) return;
  activeOptions = { ...activeOptions, watchlist: data };
  if (panel) await postWebviewMessage(panel.webview, 'leekWatchlistData', { data });
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
      localResourceRoots: [Uri.joinPath(activeOptions?.extensionUri ?? Uri.file(''), 'assets'), webviewUiRoot(activeOptions?.extensionUri ?? Uri.file(''))],
    }
  );
  panel.webview.html = renderHtml(panel, requestedPage, proxy.origin);
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    const external = readWebviewEnvelope(message, 'openLeekExternal');
    if (typeof external?.pageId === 'string') {
      const page = getLeekCenterPage(external.pageId);
      if (page) await env.openExternal(Uri.parse(page.url));
      return;
    }
    if (readWebviewEnvelope(message, 'refreshLeekWatchlist') && activeOptions?.refreshWatchlist) {
      const data = await activeOptions.refreshWatchlist();
      activeOptions = { ...activeOptions, watchlist: data };
      if (panel) await postWebviewMessage(panel.webview, 'leekWatchlistData', { data });
      return;
    }
    const openDetails = readWebviewEnvelope(message, 'openLeekWatchlistDetails');
    if ((openDetails?.kind === 'stock' || openDetails?.kind === 'fund') && typeof openDetails.code === 'string' && typeof openDetails.name === 'string') {
      await activeOptions?.openWatchlistDetails?.(openDetails.kind, openDetails.code, openDetails.name);
      return;
    }
    const loadDetails = readWebviewEnvelope(message, 'loadLeekStockDetails');
    if (typeof loadDetails?.key === 'string' && typeof loadDetails.code === 'string' && typeof loadDetails.name === 'string' && activeOptions?.loadStockDetails) {
      try {
        const token = typeof loadDetails.token === 'string' ? loadDetails.token : undefined;
        const detail = await activeOptions.loadStockDetails(loadDetails.code, loadDetails.name, token);
        if (panel) await postWebviewMessage(panel.webview, 'leekStockDetails', { key: loadDetails.key, detail });
      } catch (error) {
        if (panel) await postWebviewMessage(panel.webview, 'leekStockDetails', {
          key: loadDetails.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
  panel.onDidDispose(() => { panel = undefined; activeOptions = undefined; });
}

function renderHtml(current: WebviewPanel, requestedPage: string | undefined, eastMoneyOrigin: string): string {
  const tokenModuleUri = current.webview.asWebviewUri(Uri.joinPath(activeOptions?.extensionUri ?? Uri.file(''), 'assets', 'hexin-v.js')).toString();
  const pages = LEEK_CENTER_PAGES.map((page) => page.id === 'wind-vane' ? { ...page, url: `${eastMoneyOrigin}/zhuti/#ggfxb` } : page);
  return renderWebviewUi(current.webview, activeOptions?.extensionUri ?? Uri.file(''), {
    page: 'leekCenter', pages, initialPageId: requestedPage ?? 'bull-bear', watchlist: activeOptions?.watchlist ?? { stocks: [], funds: [], updatedAt: Date.now() },
  }, { tokenModuleUri });
}
