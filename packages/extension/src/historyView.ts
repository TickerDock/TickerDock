import { randomBytes } from 'node:crypto';
import { Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { CryptoGateway, FundGateway, FundNav } from '@stock-fund/domain';
import { filterFundNavRange, FundTrendRange } from './trendModel';
import {
  renderCandleTrendPage,
  renderFundTrendPage,
  renderTrendError,
  renderTrendLoading,
  TrendControl,
} from './trendPage';
import {
  buildStockIframeTargets,
  renderStockIframePage,
  StockChartMode,
} from './stockIframePage';
import { getEastMoneyProxy } from './eastMoneyProxy';
import { chartResources } from './chartResources';

type CryptoPeriod = '1h' | '4h' | '1d' | '1w';

const FUND_CONTROLS: readonly TrendControl[] = [
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];
const CRYPTO_CONTROLS: readonly TrendControl[] = [
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

let stockPanel: WebviewPanel | undefined;
let stockMessages: Disposable | undefined;
let fundPanel: WebviewPanel | undefined;
let fundMessages: Disposable | undefined;
let fundRequestVersion = 0;

export async function showStockHistory(
  code: string,
  name = code,
  initialMode: StockChartMode = 'standard',
  onModeChange?: (mode: StockChartMode) => void | Promise<void>
): Promise<void> {
  const title = `${name} Stock Trend`;
  return showMarketHistory(code, title, initialMode, onModeChange);
}

export async function showSectorHistory(code: string, name = code): Promise<void> {
  return showMarketHistory(code, `${name} 板块详情`, 'standard');
}

async function showMarketHistory(
  code: string,
  title: string,
  initialMode: StockChartMode,
  onModeChange?: (mode: StockChartMode) => void | Promise<void>
): Promise<void> {
  let currentPanel: WebviewPanel | undefined;
  stockMessages?.dispose();
  stockMessages = undefined;
  try {
    const proxy = await getEastMoneyProxy();
    const panel = acquireStockPanel(title, proxy.port);
    currentPanel = panel;
    const targets = buildStockIframeTargets(code, proxy.origin);
    let mode: StockChartMode = initialMode === 'chips' && targets.chips ? 'chips' : 'standard';
    const render = () => { panel.webview.html = renderStockIframePage(title, targets, mode, nonce()); };
    stockMessages = panel.webview.onDidReceiveMessage((message: unknown) => {
      const requested = readStockChartMode(message);
      if (!requested || (requested === 'chips' && !targets.chips)) return;
      mode = requested;
      render();
      void onModeChange?.(mode);
    });
    render();
  } catch (error) {
    const panel = currentPanel ?? acquireStockPanel(title);
    panel.webview.html = renderTrendError(title, error);
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
      panel.webview.html = renderFundTrendPage(
        title,
        filterFundNavRange(data, range),
        FUND_CONTROLS,
        range,
        nonce(),
        chartResources(panel.webview, extensionUri)
      );
    }
  };
  fundMessages = panel.webview.onDidReceiveMessage((message: unknown) => {
    const period = readPeriod(message);
    if (isControl(period, FUND_CONTROLS)) render(period as FundTrendRange);
  });
  panel.webview.html = renderTrendLoading(title);
  try {
    data = await gateway.getNavHistory(code);
    render('1y');
  } catch (error) {
    if (active()) panel.webview.html = renderTrendError(title, error);
  }
}

export async function showCryptoHistory(
  gateway: CryptoGateway,
  symbol: string,
  name = symbol
): Promise<void> {
  const title = `${name} Binance Trend`;
  const panel = createPanel('stockFundCryptoTrend', title);
  let requestVersion = 0;
  let disposed = false;
  panel.onDidDispose(() => { disposed = true; });

  const load = async (period: CryptoPeriod) => {
    const version = ++requestVersion;
    panel.webview.html = renderTrendLoading(title);
    try {
      const data = await gateway.getKlines(symbol, { interval: period, limit: 120 });
      if (disposed || version !== requestVersion) return;
      panel.webview.html = renderCandleTrendPage(title, data, CRYPTO_CONTROLS, period, nonce());
    } catch (error) {
      if (!disposed && version === requestVersion) panel.webview.html = renderTrendError(title, error);
    }
  };
  panel.webview.onDidReceiveMessage((message: unknown) => {
    const period = readPeriod(message);
    if (isControl(period, CRYPTO_CONTROLS)) void load(period as CryptoPeriod);
  });
  await load('1d');
}

function createPanel(viewType: string, title: string, localPort?: number, localRoot?: Uri): WebviewPanel {
  return window.createWebviewPanel(viewType, title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    ...(localPort ? {
      portMapping: [{ webviewPort: localPort, extensionHostPort: localPort }],
    } : {}),
    ...(localRoot ? { localResourceRoots: [localRoot] } : {}),
  });
}

function acquireStockPanel(title: string, localPort?: number): WebviewPanel {
  if (stockPanel) {
    stockPanel.title = title;
    stockPanel.reveal(ViewColumn.One);
    return stockPanel;
  }
  const panel = createPanel('stockFundStockTrend', title, localPort);
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
  const panel = createPanel('stockFundFundTrend', title, undefined, Uri.joinPath(extensionUri, 'dist'));
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

function readPeriod(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') return undefined;
  const value = message as Record<string, unknown>;
  return value.command === 'changePeriod' && typeof value.period === 'string' ? value.period : undefined;
}

function readStockChartMode(message: unknown): StockChartMode | undefined {
  if (!message || typeof message !== 'object') return undefined;
  const value = message as Record<string, unknown>;
  if (value.command !== 'changeStockChartMode') return undefined;
  return value.mode === 'standard' || value.mode === 'chips' ? value.mode : undefined;
}

function isControl(period: string | undefined, controls: readonly TrendControl[]): boolean {
  return period !== undefined && controls.some(({ id }) => id === period);
}

function nonce(): string {
  return randomBytes(18).toString('base64url');
}
