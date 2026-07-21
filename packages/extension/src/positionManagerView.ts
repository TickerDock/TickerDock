import { randomBytes } from 'node:crypto';
import { ViewColumn, window } from 'vscode';
import { FundPosition, StockPosition } from '@stock-fund/domain';
import {
  parseFundPositionSaveMessage,
  parseStockPositionSaveMessage,
  PositionManagerItem,
} from './positionManagerModel';
import { renderFundPositionManagerPage, renderStockPositionManagerPage } from './positionManagerPage';

export function showStockPositionManager(
  items: readonly PositionManagerItem[],
  positions: ReadonlyMap<string, StockPosition>,
  save: (positions: readonly StockPosition[]) => Promise<void>
): void {
  const panel = window.createWebviewPanel('stockFundStockPositions', 'Stock Positions', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
  });
  panel.webview.html = renderStockPositionManagerPage(items, positions, nonce());
  const allowed = new Set(items.map(({ code }) => code));
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    try {
      const parsed = parseStockPositionSaveMessage(message, allowed);
      if (!parsed) return;
      await save(parsed);
      void window.showInformationMessage('Stock positions saved.');
      panel.dispose();
    } catch (error) {
      void window.showErrorMessage(errorMessage(error));
    }
  });
}

export function showFundPositionManager(
  items: readonly PositionManagerItem[],
  positions: ReadonlyMap<string, FundPosition>,
  save: (positions: readonly FundPosition[]) => Promise<void>
): void {
  const panel = window.createWebviewPanel('stockFundFundPositions', 'Fund Positions', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
  });
  panel.webview.html = renderFundPositionManagerPage(items, positions, nonce());
  const allowed = new Set(items.map(({ code }) => code));
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    try {
      const parsed = parseFundPositionSaveMessage(message, allowed);
      if (!parsed) return;
      await save(parsed);
      void window.showInformationMessage('Fund positions saved.');
      panel.dispose();
    } catch (error) {
      void window.showErrorMessage(errorMessage(error));
    }
  });
}

function nonce(): string {
  return randomBytes(18).toString('base64url');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
