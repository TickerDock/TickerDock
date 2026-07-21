import { randomBytes } from 'node:crypto';
import { Uri, ViewColumn, window } from 'vscode';
import { MarketSentimentGateway } from '@stock-fund/domain';
import { renderMarketSentimentError, renderMarketSentimentPage } from './marketSentimentPage';
import { renderTrendLoading } from './trendPage';
import { chartResources } from './chartResources';

export async function showMarketSentiment(gateway: MarketSentimentGateway, extensionUri: Uri): Promise<void> {
  const panel = window.createWebviewPanel('stockFundMarketSentiment', 'Bull/Bear Market Compass', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [Uri.joinPath(extensionUri, 'dist')],
  });
  const nonce = randomBytes(18).toString('base64url');
  panel.webview.html = renderTrendLoading('Bull/Bear Market Compass');
  try {
    panel.webview.html = renderMarketSentimentPage(await gateway.getSnapshot(), nonce, chartResources(panel.webview, extensionUri));
  } catch (error) {
    panel.webview.html = renderMarketSentimentError(error, nonce, chartResources(panel.webview, extensionUri));
  }
}
