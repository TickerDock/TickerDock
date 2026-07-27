import { Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { FundEstimateGateway, FundGateway, FundNav, FundQuote, mergeFundEstimates } from '@stock-fund/domain';
import { filterFundNavRange, FundTrendRange } from './trendModel';
import { readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

let panel: WebviewPanel | undefined;
let messages: Disposable | undefined;
let requestVersion = 0;

export async function showFundOverview(
  gateway: FundGateway,
  estimateGateway: FundEstimateGateway,
  extensionUri: Uri,
  watched: readonly { code: string; name: string }[]
): Promise<void> {
  const current = acquirePanel(extensionUri);
  const version = ++requestVersion;
  messages?.dispose();
  messages = undefined;
  current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'fundOverview', funds: [], selectedCode: '', history: [], range: '1y', loading: true });
  if (watched.length === 0) {
    current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'fundOverview', ...emptyState() });
    return;
  }
  try {
    const codes = watched.map(({ code }) => code);
    const [quotesResult, estimatesResult] = await Promise.allSettled([
      gateway.getQuotes(codes), estimateGateway.getEstimates(codes),
    ]);
    if (!active(current, version)) return;
    const quotes = quotesResult.status === 'fulfilled'
      ? mergeFundEstimates(quotesResult.value, estimatesResult.status === 'fulfilled' ? estimatesResult.value : [])
      : watched.map(unavailableQuote);
    const byCode = new Map(quotes.map((quote) => [quote.code, quote]));
    const funds = watched.map((item) => byCode.get(item.code) ?? unavailableQuote(item));
    const histories = new Map<string, FundNav[]>();
    let selectedCode = funds[0]!.code;
    let range: FundTrendRange = '1y';
    let loadVersion = 0;
    let loading = false;
    let loadError: string | undefined;
    const render = () => {
      if (!active(current, version)) return;
      current.webview.html = renderWebviewUi(current.webview, extensionUri, {
        page: 'fundOverview', funds, selectedCode, history: filterFundNavRange(histories.get(selectedCode) ?? [], range), range, loading, error: loadError,
      });
    };
    const load = async (code: string) => {
      selectedCode = code;
      const currentLoad = ++loadVersion;
      const cached = histories.get(code);
      loadError = undefined;
      if (cached) { loading = false; render(); return; }
      loading = true;
      render();
      try {
        const history = await gateway.getNavHistory(code);
        if (!active(current, version) || currentLoad !== loadVersion) return;
        histories.set(code, history);
        loading = false;
        render();
      } catch (error) {
        if (active(current, version) && currentLoad === loadVersion) {
          loading = false;
          loadError = error instanceof Error ? error.message : String(error);
          render();
        }
      }
    };
    messages = current.webview.onDidReceiveMessage((message: unknown) => {
      const select = readWebviewEnvelope(message, 'selectFundOverviewFund');
      const change = readWebviewEnvelope(message, 'changeFundOverviewRange');
      if (typeof select?.code === 'string' && funds.some(({ code }) => code === select.code)) void load(select.code);
      if (typeof change?.range === 'string' && isRange(change.range)) { range = change.range; render(); }
    });
    await load(selectedCode);
  } catch (error) {
    if (active(current, version)) current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'fundOverview', funds: [], selectedCode: '', history: [], range: '1y', loading: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function acquirePanel(extensionUri: Uri): WebviewPanel {
  if (panel) { panel.title = 'Fund Trends'; panel.reveal(ViewColumn.One); return panel; }
  const created = window.createWebviewPanel('stockFundFundOverview', 'Fund Trends', ViewColumn.One, {
    enableScripts: true, retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel = created;
  created.onDidDispose(() => {
    if (panel !== created) return;
    panel = undefined;
    requestVersion += 1;
    messages?.dispose();
    messages = undefined;
  });
  return created;
}

function emptyState() {
  return { funds: [], selectedCode: '', history: [], range: '1y', loading: false };
}

function unavailableQuote(item: { code: string; name: string }): FundQuote {
  return { code: item.code, name: item.name, nav: 0, accumulatedNav: 0, navDate: '', source: 'fund-api', status: 'unavailable' };
}

function active(current: WebviewPanel, version: number): boolean { return panel === current && requestVersion === version; }
function isRange(value: unknown): value is FundTrendRange { return value === '1m' || value === '3m' || value === '6m' || value === '1y' || value === 'all'; }
