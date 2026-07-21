import { ColorThemeKind, ViewColumn, WebviewPanel, window } from 'vscode';
import { buildBinanceIframeTarget, renderBinanceIframePage } from './binanceIframePage';

let panel: WebviewPanel | undefined;

export function showBinanceIframe(symbol: string, name = symbol): void {
  const title = `${name} Binance Spot`;
  try {
    const light = window.activeColorTheme.kind === ColorThemeKind.Light
      || window.activeColorTheme.kind === ColorThemeKind.HighContrastLight;
    const html = renderBinanceIframePage(
      title,
      buildBinanceIframeTarget(symbol, light ? 'light' : 'dark')
    );
    if (panel) {
      panel.title = title;
      panel.reveal(ViewColumn.One);
    } else {
      panel = window.createWebviewPanel('stockFundBinanceTrend', title, ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: false,
      });
      const created = panel;
      panel.onDidDispose(() => {
        if (panel === created) panel = undefined;
      });
    }
    panel.webview.html = html;
  } catch (error) {
    void window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
