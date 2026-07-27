import { env, ProgressLocation, Uri, ViewColumn, window } from 'vscode';
import { StockResearchGateway, StockResearchItem } from '@tickerdock/domain';
import { readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

export async function showStockResearch(
  gateway: StockResearchGateway,
  query: string,
  name: string,
  extensionUri: Uri
): Promise<void> {
  const title = name;
  const panel = window.createWebviewPanel('tickerdockStockResearch', title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'stockResearch', name });
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    const payload = readWebviewEnvelope(message, 'openResearchUrl');
    const url = payload && typeof payload.url === 'string' ? trustedResearchUrl(payload.url) : undefined;
    if (url) await env.openExternal(Uri.parse(url));
  });
  let items: StockResearchItem[];
  try {
    items = await window.withProgress(
      { location: ProgressLocation.Notification, title: `正在加载 ${name} 研报...` },
      () => gateway.search(query, 15)
    );
  } catch (error) {
    items = [{
      id: 'error', title: '研报暂不可用', summary: error instanceof Error ? error.message : String(error),
      time: '', source: 'jiuyangongshe', url: 'https://www.jiuyangongshe.com/',
    }];
  }
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'stockResearch', name, items });
}

function trustedResearchUrl(value: string): string | undefined {
  return /^https:\/\/www\.jiuyangongshe\.com\/a\/[a-zA-Z0-9_-]+$/.test(value) ? value : undefined;
}
