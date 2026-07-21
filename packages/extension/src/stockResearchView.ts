import { ProgressLocation, ViewColumn, window } from 'vscode';
import { StockResearchGateway } from '@stock-fund/domain';
import { renderStockResearchError, renderStockResearchPage } from './stockResearchPage';
import { renderTrendLoading } from './trendPage';

export async function showStockResearch(
  gateway: StockResearchGateway,
  query: string,
  name: string
): Promise<void> {
  const title = `${name} Jiuyangongshe Research`;
  const panel = window.createWebviewPanel('stockFundStockResearch', title, ViewColumn.One, {
    enableScripts: false,
    retainContextWhenHidden: false,
  });
  panel.webview.html = renderTrendLoading(title);
  try {
    const items = await window.withProgress(
      { location: ProgressLocation.Notification, title: `Loading ${name} research...` },
      () => gateway.search(query, 15)
    );
    panel.webview.html = renderStockResearchPage(name, items);
  } catch (error) {
    panel.webview.html = renderStockResearchError(name, error);
  }
}
