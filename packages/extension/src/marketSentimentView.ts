import { Uri, ViewColumn, window } from 'vscode';
import { MarketSentimentGateway } from '@stock-fund/domain';
import { renderWebviewUi, webviewUiRoot } from './webviewUi';

export async function showMarketSentiment(gateway: MarketSentimentGateway, extensionUri: Uri): Promise<void> {
  const panel = window.createWebviewPanel('stockFundMarketSentiment', 'Bull/Bear Market Compass', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'marketSentiment' });
  try {
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'marketSentiment', snapshot: await gateway.getSnapshot() });
  } catch (error) {
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'marketSentiment', error: error instanceof Error ? error.message : String(error) });
  }
}
