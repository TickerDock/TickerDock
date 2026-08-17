import { Uri, ViewColumn, window } from 'vscode';
import { ConfigRepository } from './configRepository';
import { DEFAULT_PERSONALIZATION, PersonalizationConfig, validatePersonalization } from './personalizationModel';
import { postWebviewMessage, readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

export interface PersonalizationStockOption { code: string; name: string; }
export interface PersonalizationViewState extends PersonalizationConfig {
  heldStockHighlightEnabled: boolean;
  remindersEnabled: boolean;
  marketHoursEnabled: boolean;
  stockChartMode: 'standard' | 'chips';
  showMarketStatusBar: boolean;
  showStockPortfolioStatusBar: boolean;
  showFundPortfolioStatusBar: boolean;
  showStatusBarIcons: boolean;
  marketStatusBarInterval: number;
  portfolioStatusBarInterval: number;
  statusBarStocks: string[];
  availableStocks: readonly PersonalizationStockOption[];
}

export function showPersonalization(
  extensionUri: Uri,
  config: ConfigRepository,
  onApplied: () => void,
  availableStocks: readonly PersonalizationStockOption[]
): void {
  const availableCodes = new Set(availableStocks.map((stock) => stock.code));
  const defaultStatusBarStocks = availableCodes.has('SH000001')
    ? ['SH000001']
    : availableStocks.slice(0, 1).map((stock) => stock.code);
  const panel = window.createWebviewPanel('tickerdockPersonalization', '个性化设置', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  const defaultState = (): PersonalizationViewState => ({
    ...DEFAULT_PERSONALIZATION,
    heldStockHighlightEnabled: true,
    remindersEnabled: true,
    marketHoursEnabled: true,
    stockChartMode: 'standard',
    showMarketStatusBar: true,
    showStockPortfolioStatusBar: true,
    showFundPortfolioStatusBar: true,
    showStatusBarIcons: true,
    marketStatusBarInterval: 15000,
    portfolioStatusBarInterval: 15000,
    statusBarStocks: defaultStatusBarStocks,
    availableStocks,
  });
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
    marketStatusBarInterval: config.getMarketStatusBarInterval(),
    portfolioStatusBarInterval: config.getPortfolioStatusBarInterval(),
    statusBarStocks: config.getStatusBarStocks(defaultStatusBarStocks).filter((code) => availableCodes.has(code)),
    availableStocks,
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, {
    page: 'personalization', state: readState(), defaults: defaultState(),
  });
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    const dirty = readWebviewEnvelope(message, 'setDirty');
    if (dirty && typeof dirty.dirty === 'boolean') panel.title = `${dirty.dirty ? '● ' : ''}个性化设置`;
    try {
      if (readWebviewEnvelope(message, 'resetPersonalization')) {
        await saveState(config, defaultState());
        onApplied();
        await postWebviewMessage(panel.webview, 'personalizationState', { state: readState() });
        return;
      }
      const statusPayload = readWebviewEnvelope(message, 'saveStatusBarStocks');
      if (statusPayload) {
        const statusBarStocks = validateStatusBarStocks(statusPayload.value, availableStocks);
        await config.setStatusBarStocks(statusBarStocks);
        onApplied();
        await postWebviewMessage(panel.webview, 'statusBarStocksSaved', { value: statusBarStocks });
        return;
      }
      const savePayload = readWebviewEnvelope(message, 'savePersonalization');
      if (!savePayload) return;
      const value = validateViewState(savePayload.value, availableStocks);
      await saveState(config, value);
      onApplied();
      await postWebviewMessage(panel.webview, 'personalizationSaved', { state: readState() });
    } catch (error) {
      await postWebviewMessage(panel.webview, 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export function validateViewState(value: unknown, availableStocks: readonly PersonalizationStockOption[]): PersonalizationViewState {
  const record = asRecord(value);
  const personalization = validatePersonalization(record);
  const booleans = [
    'heldStockHighlightEnabled', 'remindersEnabled', 'marketHoursEnabled', 'showMarketStatusBar',
    'showStockPortfolioStatusBar', 'showFundPortfolioStatusBar', 'showStatusBarIcons',
  ] as const;
  for (const key of booleans) if (typeof record[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
  if (record.stockChartMode !== 'standard' && record.stockChartMode !== 'chips') throw new Error('Invalid stockChartMode.');
  for (const key of ['marketStatusBarInterval', 'portfolioStatusBarInterval'] as const) {
    if (typeof record[key] !== 'number' || !Number.isFinite(record[key]) || record[key] < 3000) {
      throw new Error(`Invalid ${key}.`);
    }
  }
  return {
    ...personalization,
    ...Object.fromEntries(booleans.map((key) => [key, record[key]])),
    stockChartMode: record.stockChartMode,
    marketStatusBarInterval: record.marketStatusBarInterval,
    portfolioStatusBarInterval: record.portfolioStatusBarInterval,
    statusBarStocks: validateStatusBarStocks(record.statusBarStocks, availableStocks),
    availableStocks: [],
  } as unknown as PersonalizationViewState;
}

function validateStatusBarStocks(value: unknown, availableStocks: readonly PersonalizationStockOption[]): string[] {
  if (!Array.isArray(value) || value.length > 8 || !value.every((code) => typeof code === 'string') || new Set(value).size !== value.length) {
    throw new Error('Invalid statusBarStocks.');
  }
  const available = new Set(availableStocks.map((stock) => stock.code));
  if (value.some((code) => !available.has(code))) throw new Error('Status bar stocks must be watched stocks.');
  return value;
}

async function saveState(config: ConfigRepository, value: PersonalizationViewState): Promise<void> {
  await Promise.all([
    config.setPersonalization(value), config.setHeldStockHighlightEnabled(value.heldStockHighlightEnabled),
    config.setRemindersEnabled(value.remindersEnabled), config.setMarketHoursEnabled(value.marketHoursEnabled),
    config.setStockChartMode(value.stockChartMode), config.setShowMarketStatusBar(value.showMarketStatusBar),
    config.setShowStockPortfolioStatusBar(value.showStockPortfolioStatusBar),
    config.setShowFundPortfolioStatusBar(value.showFundPortfolioStatusBar),
    config.setShowStatusBarIcons(value.showStatusBarIcons), config.setStatusBarStocks(value.statusBarStocks),
    config.setMarketStatusBarInterval(value.marketStatusBarInterval),
    config.setPortfolioStatusBarInterval(value.portfolioStatusBarInterval),
  ]);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid message.');
  return value as Record<string, unknown>;
}
