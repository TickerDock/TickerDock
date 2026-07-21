import { randomBytes } from 'node:crypto';
import { ViewColumn, window } from 'vscode';
import { ConfigRepository } from './configRepository';
import { DEFAULT_PERSONALIZATION, validatePersonalization } from './personalizationModel';
import { PersonalizationStockOption, PersonalizationViewState, renderPersonalizationPage } from './personalizationPage';

export function showPersonalization(
  config: ConfigRepository,
  onApplied: () => void,
  availableStocks: readonly PersonalizationStockOption[]
): void {
  const availableCodes = new Set(availableStocks.map((stock) => stock.code));
  const defaultStatusBarStocks = availableCodes.has('sh000001')
    ? ['sh000001']
    : availableStocks.slice(0, 1).map((stock) => stock.code);
  const panel = window.createWebviewPanel('stockFundPersonalization', 'Personalization', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  const nonce = randomBytes(16).toString('base64url');
  const readState = (): PersonalizationViewState => ({
    ...config.getPersonalization(),
    heldStockHighlightEnabled: config.getHeldStockHighlightEnabled(),
    remindersEnabled: config.getRemindersEnabled(),
    marketHoursEnabled: config.getMarketHoursEnabled(),
    stockChartMode: config.getStockChartMode(),
    showMarketStatusBar: config.getShowMarketStatusBar(),
    showStockPortfolioStatusBar: config.getShowStockPortfolioStatusBar(),
    showFundPortfolioStatusBar: config.getShowFundPortfolioStatusBar(),
    showStatusBarIcons: config.getShowStatusBarIcons(),
    statusBarStocks: config.getStatusBarStocks(defaultStatusBarStocks).filter((code) => availableCodes.has(code)),
    availableStocks,
  });
  panel.webview.html = renderPersonalizationPage(readState(), nonce);
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    try {
      const record = asRecord(message);
      if (record.type === 'reset') {
        await saveState(config, {
          ...DEFAULT_PERSONALIZATION,
          heldStockHighlightEnabled: true,
          remindersEnabled: true,
          marketHoursEnabled: true,
          stockChartMode: 'standard',
          showMarketStatusBar: true,
          showStockPortfolioStatusBar: true,
          showFundPortfolioStatusBar: true,
          showStatusBarIcons: true,
          statusBarStocks: defaultStatusBarStocks,
          availableStocks,
        });
        onApplied();
        await panel.webview.postMessage({ type: 'state', value: readState() });
        return;
      }
      if (record.type === 'saveStatusBarStocks') {
        const statusBarStocks = validateStatusBarStocks(record.value, availableStocks);
        await config.setStatusBarStocks(statusBarStocks);
        onApplied();
        await panel.webview.postMessage({ type: 'statusBarStocksSaved', value: statusBarStocks });
        return;
      }
      if (record.type !== 'save') return;
      const value = validateViewState(record.value, availableStocks);
      await saveState(config, value);
      onApplied();
      await panel.webview.postMessage({ type: 'saved' });
    } catch (error) {
      await panel.webview.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function validateViewState(value: unknown, availableStocks: readonly PersonalizationStockOption[]): PersonalizationViewState {
  const record = asRecord(value);
  const personalization = validatePersonalization(record);
  const booleans = [
    'heldStockHighlightEnabled', 'remindersEnabled', 'marketHoursEnabled', 'showMarketStatusBar',
    'showStockPortfolioStatusBar', 'showFundPortfolioStatusBar', 'showStatusBarIcons',
  ] as const;
  for (const key of booleans) if (typeof record[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
  if (record.stockChartMode !== 'standard' && record.stockChartMode !== 'chips') {
    throw new Error('Invalid stockChartMode.');
  }
  const statusBarStocks = validateStatusBarStocks(record.statusBarStocks, availableStocks);
  return {
    ...personalization,
    ...Object.fromEntries(booleans.map((key) => [key, record[key]])),
    stockChartMode: record.stockChartMode,
    statusBarStocks,
    availableStocks: [],
  } as unknown as PersonalizationViewState;
}

function validateStatusBarStocks(
  value: unknown,
  availableStocks: readonly PersonalizationStockOption[]
): string[] {
  if (!Array.isArray(value)
    || value.length > 8
    || !value.every((code) => typeof code === 'string')
    || new Set(value).size !== value.length) {
    throw new Error('Invalid statusBarStocks.');
  }
  const available = new Set(availableStocks.map((stock) => stock.code));
  if (value.some((code) => !available.has(code))) {
    throw new Error('Status bar stocks must be watched stocks.');
  }
  return value;
}

async function saveState(config: ConfigRepository, value: PersonalizationViewState): Promise<void> {
  await Promise.all([
    config.setPersonalization(value),
    config.setHeldStockHighlightEnabled(value.heldStockHighlightEnabled),
    config.setRemindersEnabled(value.remindersEnabled),
    config.setMarketHoursEnabled(value.marketHoursEnabled),
    config.setStockChartMode(value.stockChartMode),
    config.setShowMarketStatusBar(value.showMarketStatusBar),
    config.setShowStockPortfolioStatusBar(value.showStockPortfolioStatusBar),
    config.setShowFundPortfolioStatusBar(value.showFundPortfolioStatusBar),
    config.setShowStatusBarIcons(value.showStatusBarIcons),
    config.setStatusBarStocks(value.statusBarStocks),
  ]);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid message.');
  return value as Record<string, unknown>;
}
