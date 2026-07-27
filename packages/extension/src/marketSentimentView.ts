import { Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { MarketSentimentGateway } from '@tickerdock/domain';
import { postWebviewMessage, readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

let marketSentimentPanel: WebviewPanel | undefined;
let marketSentimentRequestVersion = 0;
let marketSentimentMessages: Disposable | undefined;

const ASYNC_SECTIONS = ['hotThemes', 'marketFundFlow', 'stockFundFlowRank', 'sectorFundFlowRank'] as const;
type AsyncSection = typeof ASYNC_SECTIONS[number];

export async function showMarketSentiment(gateway: MarketSentimentGateway, extensionUri: Uri): Promise<void> {
  const panel = acquireMarketSentimentPanel(extensionUri);
  const requestVersion = ++marketSentimentRequestVersion;
  const active = () => marketSentimentPanel === panel && marketSentimentRequestVersion === requestVersion;
  let breadth;
  try {
    breadth = await gateway.getBreadth();
    if (!breadth) throw new Error('暂无有效的市场涨跌数据。');
  } catch (error) {
    if (active()) panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'marketSentiment', error: error instanceof Error ? error.message : String(error) });
    return;
  }
  if (!active()) return;

  let started = false;
  marketSentimentMessages?.dispose();
  marketSentimentMessages = panel.webview.onDidReceiveMessage((message: unknown) => {
    if (!readWebviewEnvelope(message, 'marketSentimentReady') || started || !active()) return;
    started = true;
    void loadAsyncSections(gateway, panel, active);
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, {
    page: 'marketSentiment', snapshot: { breadth }, loadingSections: [...ASYNC_SECTIONS],
  });
}

async function loadAsyncSections(
  gateway: MarketSentimentGateway,
  panel: WebviewPanel,
  active: () => boolean
): Promise<void> {
  const requests: Record<AsyncSection, () => Promise<unknown>> = {
    hotThemes: () => gateway.getHotThemes(),
    marketFundFlow: () => gateway.getMarketFundFlow(),
    stockFundFlowRank: () => gateway.getStockFundFlowRank(),
    sectorFundFlowRank: () => gateway.getSectorFundFlowRank(),
  };
  await Promise.all(ASYNC_SECTIONS.map(async (section) => {
    try {
      const value = await requests[section]();
      if (active()) await postWebviewMessage(panel.webview, 'marketSentimentSection', { section, value });
    } catch (error) {
      if (active()) await postWebviewMessage(panel.webview, 'marketSentimentSection', {
        section, error: error instanceof Error ? error.message : String(error),
      });
    }
  }));
}

function acquireMarketSentimentPanel(extensionUri: Uri): WebviewPanel {
  if (marketSentimentPanel) {
    marketSentimentPanel.reveal(ViewColumn.One);
    return marketSentimentPanel;
  }
  const panel = window.createWebviewPanel('tickerdockMarketSentiment', 'Bull/Bear Market Compass', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  marketSentimentPanel = panel;
  panel.onDidDispose(() => {
    if (marketSentimentPanel !== panel) return;
    marketSentimentPanel = undefined;
    marketSentimentRequestVersion += 1;
    marketSentimentMessages?.dispose();
    marketSentimentMessages = undefined;
  });
  return panel;
}
