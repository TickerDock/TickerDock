import { ProgressLocation, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { StockGateway, StockResearchGateway } from '@tickerdock/domain';
import { loadBasicStockExtendedDetail } from './stockExtendedDetailLoader';
import { renderWebviewUi, webviewUiRoot } from './webviewUi';

let panel: WebviewPanel | undefined;
let requestVersion = 0;

export async function showStockExtendedDetails(
  stockGateway: StockGateway,
  researchGateway: StockResearchGateway,
  extensionUri: Uri,
  code: string,
  name = code
): Promise<void> {
  const title = `${name} Stock Details`;
  const current = acquirePanel(title, extensionUri);
  const version = ++requestVersion;
  current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'stockExtendedDetail', title });
  try {
    const detail = await window.withProgress(
      { location: ProgressLocation.Notification, title: `Loading ${name} stock details...` },
      () => loadBasicStockExtendedDetail(stockGateway, researchGateway, code, name)
    );
    if (panel === current && version === requestVersion) current.webview.html = renderWebviewUi(current.webview, extensionUri, { page: 'stockExtendedDetail', title, detail });
  } catch (error) {
    if (panel === current && version === requestVersion) current.webview.html = renderWebviewUi(current.webview, extensionUri, {
      page: 'stockExtendedDetail', title, error: error instanceof Error ? error.message : String(error),
    });
  }
}

function acquirePanel(title: string, extensionUri: Uri): WebviewPanel {
  if (panel) {
    panel.title = title;
    panel.reveal(ViewColumn.One);
    return panel;
  }
  const created = window.createWebviewPanel('tickerdockExtendedStockDetail', title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [Uri.joinPath(extensionUri, 'assets'), webviewUiRoot(extensionUri)],
  });
  panel = created;
  created.onDidDispose(() => {
    if (panel !== created) return;
    panel = undefined;
    requestVersion += 1;
  });
  return created;
}
