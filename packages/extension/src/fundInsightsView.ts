import { Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { FundInsightsGateway } from '@stock-fund/domain';
import { renderWebviewUi, webviewUiRoot } from './webviewUi';

let detailPanel: WebviewPanel | undefined;
let detailRequestVersion = 0;

export async function showFundDetails(gateway: FundInsightsGateway, extensionUri: Uri, code: string, name = code): Promise<void> {
  const title = `${name} 基金详情`;
  const panel = acquireDetailPanel(title, extensionUri);
  const version = ++detailRequestVersion;
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundDetail', title });
  try {
    const detail = await gateway.getDetail(code);
    if (detailPanel === panel && version === detailRequestVersion) {
      panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundDetail', title, detail });
    }
  } catch (error) {
    if (detailPanel === panel && version === detailRequestVersion) panel.webview.html = renderWebviewUi(panel.webview, extensionUri, {
      page: 'fundDetail', title, error: errorMessage(error),
    });
  }
}

export async function showFundHoldings(gateway: FundInsightsGateway, extensionUri: Uri, code: string): Promise<void> {
  const panel = createPanel(`基金持仓：${code}`, extensionUri);
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundHoldings', code });
  try {
    const items = await gateway.getHoldings(code);
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundHoldings', code, items });
  } catch (error) {
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundHoldings', code, error: errorMessage(error) });
  }
}

export async function showFundRanking(gateway: FundInsightsGateway, extensionUri: Uri): Promise<void> {
  const panel = createPanel('基金排行', extensionUri);
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundRanking' });
  try {
    const items = await gateway.getRanking(40);
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundRanking', items });
  } catch (error) {
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundRanking', error: errorMessage(error) });
  }
}

export async function showFundFlows(gateway: FundInsightsGateway, extensionUri: Uri): Promise<void> {
  const panel = createPanel('市场资金流', extensionUri);
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundFlows' });
  try {
    const [industry, concept, region] = await Promise.all([
      gateway.getFlows('industry', 20), gateway.getFlows('concept', 20), gateway.getFlows('region', 20),
    ]);
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundFlows', industry, concept, region });
  } catch (error) {
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundFlows', error: errorMessage(error) });
  }
}

function createPanel(title: string, extensionUri: Uri): WebviewPanel {
  return window.createWebviewPanel('stockFundInsights', title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
}

function acquireDetailPanel(title: string, extensionUri: Uri): WebviewPanel {
  if (detailPanel) {
    detailPanel.title = title;
    detailPanel.reveal(ViewColumn.One);
    return detailPanel;
  }
  const panel = window.createWebviewPanel('stockFundExtendedFundDetail', title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  detailPanel = panel;
  panel.onDidDispose(() => {
    if (detailPanel !== panel) return;
    detailPanel = undefined;
    detailRequestVersion += 1;
  });
  return panel;
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
