import { Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { FundGateway, FundNav, Kline, StockGateway } from '@tickerdock/domain';
import { filterFundNavRange, FundTrendRange } from './trendModel';
import { readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';
import {
  buildStockIframeTargets,
  StockChartMode,
} from './stockIframePage';
import { authenticateProxyUrl, getEastMoneyProxy } from './eastMoneyProxy';

interface TrendControl { id: string; label: string }

const FUND_CONTROLS: readonly TrendControl[] = [
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];
const STOCK_KLINE_CONTROLS: readonly TrendControl[] = [
  { id: 'day', label: '\u65e5K' },
  { id: 'week', label: '\u5468K' },
  { id: 'month', label: '\u6708K' },
];

let stockPanel: WebviewPanel | undefined;
let stockMessages: Disposable | undefined;
let fundPanel: WebviewPanel | undefined;
let fundMessages: Disposable | undefined;
let fundRequestVersion = 0;
let klinePanel: WebviewPanel | undefined;
let klineMessages: Disposable | undefined;
let klineRequestVersion = 0;

export async function showStockHistory(
  extensionUri: Uri,
  code: string,
  name = code,
  initialMode: StockChartMode = 'standard',
  onModeChange?: (mode: StockChartMode) => void | Promise<void>,
  stockGateway?: StockGateway
): Promise<void> {
  const title = `${name} Stock Trend`;
  if (stockGateway && isIndexStock(code, name)) return showStockKline(stockGateway, extensionUri, code, name);
  return showMarketHistory(extensionUri, code, title, initialMode, onModeChange);
}

export async function showStockKline(stockGateway: StockGateway, extensionUri: Uri, code: string, name = code): Promise<void> {
  const title = `${name} K\u7ebf`;
  const panel = acquireKlinePanel(title, extensionUri);
  const requestVersion = ++klineRequestVersion;
  klineMessages?.dispose();
  let period: 'day' | 'week' | 'month' = 'day';
  const active = () => klinePanel === panel && requestVersion === klineRequestVersion;
  const render = (data?: Kline[], error?: string) => {
    if (active()) panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'stockKline', title, code, data, controls: STOCK_KLINE_CONTROLS, active: period, error });
  };
  const load = async () => {
    render();
    try { render(await stockGateway.getKlines(code, { period, count: 240, adjust: 'none' })); }
    catch (error) { render(undefined, error instanceof Error ? error.message : String(error)); }
  };
  klineMessages = panel.webview.onDidReceiveMessage((message: unknown) => {
    const payload = readWebviewEnvelope(message, 'changeStockKlinePeriod');
    if (payload?.period !== 'day' && payload?.period !== 'week' && payload?.period !== 'month') return;
    period = payload.period;
    void load();
  });
  await load();
}

export async function showSectorHistory(extensionUri: Uri, code: string, name = code): Promise<void> {
  return showMarketHistory(extensionUri, code, `${name} 板块详情`, 'standard');
}

async function showMarketHistory(
  extensionUri: Uri,
  code: string,
  title: string,
  initialMode: StockChartMode,
  onModeChange?: (mode: StockChartMode) => void | Promise<void>
): Promise<void> {
  const startedAt = performance.now();
  let currentPanel: WebviewPanel | undefined;
  stockMessages?.dispose();
  stockMessages = undefined;
  try {
    const proxy = await getEastMoneyProxy();
    const proxyReadyAt = performance.now();
    const panel = acquireStockPanel(title, extensionUri, proxy.port);
    currentPanel = panel;
    const rawTargets = buildStockIframeTargets(code, proxy.origin);
    const targets = {
      standard: authenticateProxyUrl(rawTargets.standard, proxy),
      chips: rawTargets.chips ? authenticateProxyUrl(rawTargets.chips, proxy) : undefined,
    };
    let mode: StockChartMode = initialMode === 'chips' && targets.chips ? 'chips' : 'standard';
    let renderedAt = performance.now();
    const render = () => {
      renderedAt = performance.now();
      panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'stockMarketFrame', title, targets, mode });
    };
    stockMessages = panel.webview.onDidReceiveMessage((message: unknown) => {
      if (readWebviewEnvelope(message, 'stockMarketFrameLoaded')) {
        const loadedAt = performance.now();
        console.debug(
          `[tickerdock] Stock frame ${code} proxy=${Math.round(proxyReadyAt - startedAt)}ms`
            + ` webview+iframe=${Math.round(loadedAt - renderedAt)}ms total=${Math.round(loadedAt - startedAt)}ms`
        );
        return;
      }
      const payload = readWebviewEnvelope(message, 'changeStockChartMode');
      const requested = payload?.mode === 'standard' || payload?.mode === 'chips' ? payload.mode : undefined;
      if (!requested || (requested === 'chips' && !targets.chips)) return;
      mode = requested;
      render();
      void onModeChange?.(mode);
    });
    render();
  } catch (error) {
    const panel = currentPanel ?? acquireStockPanel(title, extensionUri);
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'stockMarketFrame', title, mode: 'standard', error: error instanceof Error ? error.message : String(error) });
  }
}

export async function showFundHistory(
  gateway: FundGateway,
  extensionUri: Uri,
  code: string,
  name = code
): Promise<void> {
  const title = `${name} Fund Trend`;
  const panel = acquireFundPanel(title, extensionUri);
  const requestVersion = ++fundRequestVersion;
  fundMessages?.dispose();
  fundMessages = undefined;
  let data: FundNav[] | undefined;
  const active = () => fundPanel === panel && requestVersion === fundRequestVersion;
  const render = (range: FundTrendRange) => {
    if (active() && data) {
      panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundTrend', title, data: filterFundNavRange(data, range), controls: FUND_CONTROLS, active: range });
    }
  };
  fundMessages = panel.webview.onDidReceiveMessage((message: unknown) => {
    const payload = readWebviewEnvelope(message, 'changeFundTrendRange');
    if (typeof payload?.range === 'string' && isControl(payload.range, FUND_CONTROLS)) render(payload.range as FundTrendRange);
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundTrend', title, controls: FUND_CONTROLS, active: '1y' });
  try {
    data = await gateway.getNavHistory(code);
    render('1y');
  } catch (error) {
    if (active()) panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundTrend', title, controls: FUND_CONTROLS, active: '1y', error: error instanceof Error ? error.message : String(error) });
  }
}

function createPanel(viewType: string, title: string, localPort?: number, localRoot?: Uri): WebviewPanel {
  return window.createWebviewPanel(viewType, title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: viewType === 'tickerdockStockTrend',
    ...(localPort ? {
      portMapping: [{ webviewPort: localPort, extensionHostPort: localPort }],
    } : {}),
    ...(localRoot ? { localResourceRoots: [localRoot] } : {}),
  });
}

function acquireStockPanel(title: string, extensionUri: Uri, localPort?: number): WebviewPanel {
  if (stockPanel) {
    stockPanel.title = title;
    stockPanel.reveal(ViewColumn.One);
    return stockPanel;
  }
  const panel = createPanel('tickerdockStockTrend', title, localPort, webviewUiRoot(extensionUri));
  stockPanel = panel;
  panel.onDidDispose(() => {
    if (stockPanel !== panel) return;
    stockPanel = undefined;
    stockMessages?.dispose();
    stockMessages = undefined;
  });
  return panel;
}

function acquireFundPanel(title: string, extensionUri: Uri): WebviewPanel {
  if (fundPanel) {
    fundPanel.title = title;
    fundPanel.reveal(ViewColumn.One);
    return fundPanel;
  }
  const panel = createPanel('tickerdockFundTrend', title, undefined, webviewUiRoot(extensionUri));
  fundPanel = panel;
  panel.onDidDispose(() => {
    if (fundPanel !== panel) return;
    fundPanel = undefined;
    fundRequestVersion += 1;
    fundMessages?.dispose();
    fundMessages = undefined;
  });
  return panel;
}

function acquireKlinePanel(title: string, extensionUri: Uri): WebviewPanel {
  if (klinePanel) { klinePanel.title = title; klinePanel.reveal(ViewColumn.One); return klinePanel; }
  const panel = createPanel('tickerdockStockKline', title, undefined, webviewUiRoot(extensionUri));
  klinePanel = panel;
  panel.onDidDispose(() => {
    if (klinePanel !== panel) return;
    klinePanel = undefined;
    klineRequestVersion += 1;
    klineMessages?.dispose();
    klineMessages = undefined;
  });
  return panel;
}

function isIndexStock(code: string, name: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (normalized.startsWith('HF')) return false;
  return ['USDJI', 'USIXIC', 'USINX', '0DJI', '0IXIC', '0INX'].includes(normalized) || /\u6307\u6570/.test(name);
}

function isControl(period: string | undefined, controls: readonly TrendControl[]): boolean {
  return period !== undefined && controls.some(({ id }) => id === period);
}
