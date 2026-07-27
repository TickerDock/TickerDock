import { ColorThemeKind, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { buildBinanceIframeTarget } from './binanceIframePage';
import { renderWebviewUi, webviewUiRoot } from './webviewUi';

let panel: WebviewPanel | undefined;

export function showBinanceIframe(extensionUri: Uri, symbol: string, name = symbol): void {
  const title = `${name} Binance Spot`;
  try {
    const light = window.activeColorTheme.kind === ColorThemeKind.Light
      || window.activeColorTheme.kind === ColorThemeKind.HighContrastLight;
    const source = buildBinanceIframeTarget(symbol, light ? 'light' : 'dark');
    if (panel) {
      panel.title = title;
      panel.reveal(ViewColumn.One);
    } else {
      panel = window.createWebviewPanel('tickerdockBinanceTrend', title, ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [webviewUiRoot(extensionUri)],
      });
      const created = panel;
      panel.onDidDispose(() => {
        if (panel === created) panel = undefined;
      });
    }
    panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'binanceFrame', title, source });
  } catch (error) {
    void window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
