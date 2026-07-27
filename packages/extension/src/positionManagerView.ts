import { Uri, ViewColumn, window } from 'vscode';
import { FundPosition, StockPosition } from '@stock-fund/domain';
import {
  parseFundPositionSaveMessage,
  parseStockPositionSaveMessage,
  PositionManagerItem,
} from './positionManagerModel';
import { readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

export function showStockPositionManager(
  extensionUri: Uri,
  items: readonly PositionManagerItem[],
  positions: ReadonlyMap<string, StockPosition>,
  save: (positions: readonly StockPosition[]) => Promise<void>
): void {
  const panel = window.createWebviewPanel('stockFundStockPositions', '股票持仓', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, {
    page: 'stockPositions', items: [...items], positions: [...positions.values()].map((value) => ({ ...value, soldOut: Boolean(value.soldOut) })),
  });
  const allowed = new Set(items.map(({ code }) => code));
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    try {
      updateDirtyTitle(panel, message, '股票持仓');
      const parsed = parseStockPositionSaveMessage(message, allowed);
      if (!parsed) return;
      await save(parsed);
      void window.showInformationMessage('股票持仓已保存。');
      panel.dispose();
    } catch (error) {
      void window.showErrorMessage(errorMessage(error));
    }
  });
}

export function showFundPositionManager(
  extensionUri: Uri,
  items: readonly PositionManagerItem[],
  positions: ReadonlyMap<string, FundPosition>,
  save: (positions: readonly FundPosition[]) => Promise<void>
): void {
  const panel = window.createWebviewPanel('stockFundFundPositions', '基金持仓', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, {
    page: 'fundPositions', items: [...items], positions: [...positions.values()],
  });
  const allowed = new Set(items.map(({ code }) => code));
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    try {
      updateDirtyTitle(panel, message, '基金持仓');
      const parsed = parseFundPositionSaveMessage(message, allowed);
      if (!parsed) return;
      await save(parsed);
      void window.showInformationMessage('基金持仓已保存。');
      panel.dispose();
    } catch (error) {
      void window.showErrorMessage(errorMessage(error));
    }
  });
}

function updateDirtyTitle(panel: { title: string }, message: unknown, title: string): void {
  const payload = readWebviewEnvelope(message, 'setDirty');
  if (payload && typeof payload.dirty === 'boolean') panel.title = `${payload.dirty ? '● ' : ''}${title}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
