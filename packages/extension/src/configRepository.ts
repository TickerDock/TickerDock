import { ConfigurationTarget, workspace } from 'vscode';
import { FundPosition, localDateString, StockPosition, StockReminderRule } from '@tickerdock/domain';
import { asRecord, parseFundPositions, parseStockPositions } from './positionConfig';
import { FundSortMode, legacyFundSortMode, legacySortMode, SortMode } from './sortModel';
import { StockChartMode } from './stockIframePage';
import {
  DEFAULT_PERSONALIZATION,
  normalizeLegacyColor,
  normalizePersonalization,
  PersonalizationConfig,
} from './personalizationModel';
import {
  flattenStockWatchGroups,
  normalizeStockWatchGroups,
  resolveStockWatchGroups,
  StockWatchGroup,
} from './stockWatchGroupModel';

export type { StockWatchGroup } from './stockWatchGroupModel';

export interface FundWatchGroup {
  name: string;
  codes: string[];
}
export interface Sector { code: string; name: string; }

export interface AiConfig {
  baseUrl: string;
  model: string;
  apiMode: 'responses' | 'chat-completions';
}

export type AiStockHistoryRange = '1w' | '1m' | '3m' | '6m' | '1y';

export class ConfigRepository {
  async migrateBetaNamespace(): Promise<void> {
    const current = workspace.getConfiguration('tickerdock');
    const beta = workspace.getConfiguration('stock-fund');
    for (const key of MIGRATABLE_BETA_KEYS) {
      const target = current.inspect<unknown>(key);
      const source = beta.inspect<unknown>(key);
      if (target?.globalValue === undefined && source?.globalValue !== undefined) {
        await current.update(key, source.globalValue, ConfigurationTarget.Global);
      }
      if (target?.workspaceValue === undefined && source?.workspaceValue !== undefined) {
        await current.update(key, source.workspaceValue, ConfigurationTarget.Workspace);
      }
    }
  }

  getSectors(): Sector[] {
    const value = workspace.getConfiguration('tickerdock').get<unknown>('sectors', []);
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const code = typeof record.code === 'string' ? record.code.trim().toUpperCase() : '';
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      return code && name && /^BK\d{4}$/.test(code) ? [{ code, name }] : [];
    });
  }
  async setSectors(sectors: readonly Sector[]): Promise<void> {
    const normalized = [...new Map(sectors.map((item) => [item.code.trim().toUpperCase(), { code: item.code.trim().toUpperCase(), name: item.name.trim() }])).values()]
      .filter((item) => /^BK\d{4}$/.test(item.code) && item.name);
    await this.write('sectors', normalized);
  }
  getStocks(defaultValue: string[]): string[] {
    return uniqueStrings(this.readCompatible<unknown>('stocks', defaultValue)).map(normalizeConfiguredStockCode);
  }

  async setStocks(codes: readonly string[]): Promise<void> {
    await this.write('stocks', uniqueStrings(codes));
  }

  getStockGroups(defaultCodes: string[]): StockWatchGroup[] {
    const current = workspace.getConfiguration('tickerdock');
    const lists = current.get<unknown>('stockLists');
    const legacyCodes = this.getStocks(defaultCodes);
    const groups = resolveStockWatchGroups(
      current.get<unknown>('stockGroups'),
      lists,
      legacyCodes,
      hasExplicitValue(current.inspect<unknown>('stockLists'))
    );
    return groups.map((group) => ({ ...group, codes: group.codes.map(normalizeConfiguredStockCode) }));
  }

  async setStockGroups(groups: readonly StockWatchGroup[]): Promise<void> {
    const normalized = normalizeStockWatchGroups(groups);
    await Promise.all([
      this.write('stockGroups', normalized.map(({ name }) => name)),
      this.write('stockLists', normalized.map(({ codes }) => codes)),
      this.write('stocks', flattenStockWatchGroups(normalized)),
    ]);
  }

  getFundGroups(defaultCodes: string[][]): FundWatchGroup[] {
    const listsValue = this.readCompatible<unknown>('funds', defaultCodes);
    const lists = Array.isArray(listsValue)
      ? listsValue.map((item) => uniqueStrings(item))
      : defaultCodes;
    const configuredNames = uniqueStrings(this.readCompatible<unknown>('fundGroups', []));
    return lists.map((codes, index) => ({
      name: configuredNames[index] || `Fund Group ${index + 1}`,
      codes,
    }));
  }

  async setFundGroups(groups: readonly FundWatchGroup[]): Promise<void> {
    await Promise.all([
      this.write('fundGroups', groups.map(({ name }) => name)),
      this.write('funds', groups.map(({ codes }) => uniqueStrings(codes))),
    ]);
  }

  getStockPositions(): Map<string, StockPosition> {
    const positions = parseStockPositions(this.readCompatible<unknown>('stockPrice', {}));
    return new Map([...positions].map(([code, position]) => {
      const normalized = normalizeConfiguredStockCode(code);
      return [normalized, { ...position, code: normalized }];
    }));
  }

  async setStockPosition(position: StockPosition): Promise<void> {
    const raw = asRecord(this.readCompatible<unknown>('stockPrice', {}));
    raw[position.code] = {
      ...asRecord(raw[position.code]),
      amount: position.quantity,
      unitPrice: position.costPrice,
      todayUnitPrice: position.todayTradePrice || 0,
      isSellOut: Boolean(position.soldOut),
      sellOutDate: position.soldOut ? localDateString() : '',
    };
    await this.write('stockPrice', raw);
  }

  async replaceStockPositions(positions: readonly StockPosition[]): Promise<void> {
    await this.write('stockPrice', Object.fromEntries(positions.map((position) => [position.code, {
      amount: position.quantity,
      unitPrice: position.costPrice,
      todayUnitPrice: position.todayTradePrice || 0,
      isSellOut: Boolean(position.soldOut),
      sellOutDate: position.soldOut ? position.soldOutDate || localDateString() : '',
    }])));
  }

  getFundPositions(): Map<string, FundPosition> {
    return parseFundPositions(this.readCompatible<unknown>('fundAmount', {}));
  }

  async setFundPosition(position: FundPosition): Promise<void> {
    const raw = asRecord(this.readCompatible<unknown>('fundAmount', {}));
    raw[position.code] = {
      ...asRecord(raw[position.code]),
      shares: position.shares,
      unitPrice: position.costNav,
      amount: position.shares * position.costNav,
    };
    await this.write('fundAmount', raw);
  }

  async replaceFundPositions(positions: readonly FundPosition[]): Promise<void> {
    await this.write('fundAmount', Object.fromEntries(positions.map((position) => [position.code, {
      shares: position.shares,
      unitPrice: position.costNav,
      amount: position.shares * position.costNav,
    }])));
  }

  getInterval(): number {
    return Math.max(this.readCompatible<number>('interval', 15000), 3000);
  }

  getMarketHoursEnabled(): boolean {
    return workspace.getConfiguration('tickerdock').get<boolean>('marketHoursEnabled', true);
  }

  async setMarketHoursEnabled(enabled: boolean): Promise<void> {
    await this.write('marketHoursEnabled', enabled);
  }

  getStockChartMode(): StockChartMode {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<string>('stockChartMode'))) {
      return current.get('stockChartMode') === 'chips' ? 'chips' : 'standard';
    }
    return workspace.getConfiguration('leek-fund').get<number>('stockKLineChartSwitch', 0) === 1
      ? 'chips'
      : 'standard';
  }

  async setStockChartMode(mode: StockChartMode): Promise<void> {
    await this.write('stockChartMode', mode);
  }

  getHeldStockHighlightEnabled(): boolean {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<boolean>('heldStockHighlightEnabled'))) {
      return current.get('heldStockHighlightEnabled', true);
    }
    return workspace.getConfiguration('leek-fund').get<boolean>('stockHeldTipShow', true);
  }

  async setHeldStockHighlightEnabled(enabled: boolean): Promise<void> {
    await this.write('heldStockHighlightEnabled', enabled);
  }

  getPersonalization(): PersonalizationConfig {
    const current = workspace.getConfiguration('tickerdock');
    const legacy = workspace.getConfiguration('leek-fund');
    const legacyFormats = asRecord(legacy.get<unknown>('labelFormat', {}));
    const readString = (key: keyof PersonalizationConfig, legacyValue: unknown, fallback: string): string => {
      if (hasExplicitValue(current.inspect<string>(key))) return current.get<string>(key, fallback);
      return typeof legacyValue === 'string' ? legacyValue : fallback;
    };
    const legacyIcon = legacy.get<string>('iconType', 'arrow');
    return normalizePersonalization({
      sidebarDisplayMode: hasExplicitValue(current.inspect<string>('sidebarDisplayMode'))
        ? current.get('sidebarDisplayMode')
        : hasExplicitValue(legacy.inspect<unknown>('labelFormat')) ? 'template' : 'standard',
      stockLabelTemplate: readString(
        'stockLabelTemplate', legacyFormats.sidebarStockLabelFormat, DEFAULT_PERSONALIZATION.stockLabelTemplate
      ),
      fundLabelTemplate: readString(
        'fundLabelTemplate', legacyFormats.sidebarFundLabelFormat, DEFAULT_PERSONALIZATION.fundLabelTemplate
      ),
      statusBarLabelTemplate: readString(
        'statusBarLabelTemplate', legacyFormats.statusBarLabelFormat, DEFAULT_PERSONALIZATION.statusBarLabelTemplate
      ),
      stockPortfolioTemplate: current.get('stockPortfolioTemplate', DEFAULT_PERSONALIZATION.stockPortfolioTemplate),
      fundPortfolioTemplate: current.get('fundPortfolioTemplate', DEFAULT_PERSONALIZATION.fundPortfolioTemplate),
      changeIconStyle: hasExplicitValue(current.inspect<string>('changeIconStyle'))
        ? current.get<string>('changeIconStyle') as PersonalizationConfig['changeIconStyle']
        : legacyIcon as PersonalizationConfig['changeIconStyle'],
      useCustomStatusBarColors: hasExplicitValue(current.inspect<boolean>('useCustomStatusBarColors'))
        ? current.get('useCustomStatusBarColors')
        : hasExplicitValue(legacy.inspect<string>('riseColor')) || hasExplicitValue(legacy.inspect<string>('fallColor')),
      riseColor: normalizeLegacyColor(
        readString('riseColor', legacy.get('riseColor'), DEFAULT_PERSONALIZATION.riseColor),
        DEFAULT_PERSONALIZATION.riseColor
      ),
      fallColor: normalizeLegacyColor(
        readString('fallColor', legacy.get('fallColor'), DEFAULT_PERSONALIZATION.fallColor),
        DEFAULT_PERSONALIZATION.fallColor
      ),
    });
  }

  async setPersonalization(value: PersonalizationConfig): Promise<void> {
    const keys: Array<keyof PersonalizationConfig> = [
      'sidebarDisplayMode',
      'stockLabelTemplate',
      'fundLabelTemplate',
      'statusBarLabelTemplate',
      'stockPortfolioTemplate',
      'fundPortfolioTemplate',
      'changeIconStyle',
      'useCustomStatusBarColors',
      'riseColor',
      'fallColor',
    ];
    await Promise.all(keys.map((key) => this.write(key, value[key])));
  }

  getStockSortMode(): SortMode { return this.getSortMode('stockSortMode', 'stockSort'); }
  getFundSortMode(): FundSortMode {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<string>('fundSortMode'))) return legacyFundSortMode(current.get('fundSortMode'));
    return legacyFundSortMode(workspace.getConfiguration('leek-fund').get('fundSort', 0));
  }
  getBinanceSortMode(): SortMode { return this.getSortMode('binanceSortMode', 'binanceSort'); }

  async setStockSortMode(mode: SortMode): Promise<void> { await this.write('stockSortMode', mode); }
  async setFundSortMode(mode: FundSortMode): Promise<void> { await this.write('fundSortMode', mode); }
  async setBinanceSortMode(mode: SortMode): Promise<void> { await this.write('binanceSortMode', mode); }

  getBinancePairs(): string[] {
    return uniqueStrings(this.readCompatible<unknown>('binance', ['BTC_USDT', 'ETH_USDT']));
  }

  async setBinancePairs(pairs: readonly string[]): Promise<void> {
    await this.write('binance', uniqueStrings(pairs));
  }

  getBinanceInterval(): number {
    return Math.max(workspace.getConfiguration('tickerdock').get<number>('binanceInterval', 10000), 5000);
  }

  getForexInterval(): number {
    return Math.max(workspace.getConfiguration('tickerdock').get<number>('forexInterval', 3600000), 300000);
  }

  getNewsInterval(): number {
    return Math.max(workspace.getConfiguration('tickerdock').get<number>('newsInterval', 15000), 10000);
  }

  getImportantNewsOnly(): boolean {
    return workspace.getConfiguration('tickerdock').get<boolean>('importantNewsOnly', false);
  }

  getNewsSources(): Array<'jin10' | 'xuangubao'> {
    const value = workspace.getConfiguration('tickerdock').get<unknown>('newsSources', ['jin10', 'xuangubao']);
    if (!Array.isArray(value)) return ['jin10', 'xuangubao'];
    return [...new Set(value.filter((item): item is 'jin10' | 'xuangubao' => item === 'jin10' || item === 'xuangubao'))];
  }

  getFlashNewsOutputEnabled(): boolean {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<boolean>('flashNewsOutputEnabled'))) {
      return current.get('flashNewsOutputEnabled', false);
    }
    return workspace.getConfiguration('leek-fund').get<boolean>('flash-news', false);
  }

  async setFlashNewsOutputEnabled(enabled: boolean): Promise<void> {
    await this.write('flashNewsOutputEnabled', enabled);
  }

  getFlashNewsNotificationsEnabled(): boolean {
    return workspace.getConfiguration('tickerdock').get<boolean>('flashNewsNotificationsEnabled', false);
  }

  getAiConfig(): AiConfig {
    const configuration = workspace.getConfiguration('tickerdock');
    const apiMode = configuration.get<string>('aiApiMode', 'responses');
    return {
      baseUrl: configuration.get('aiBaseUrl', 'https://api.openai.com/v1'),
      model: configuration.get('aiModel', 'gpt-5.6'),
      apiMode: apiMode === 'chat-completions' ? 'chat-completions' : 'responses',
    };
  }

  async setAiConfig(config: AiConfig): Promise<void> {
    await Promise.all([
      this.write('aiBaseUrl', config.baseUrl),
      this.write('aiModel', config.model),
      this.write('aiApiMode', config.apiMode),
    ]);
  }

  getAiStockHistoryRange(): AiStockHistoryRange {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<string>('aiStockHistoryRange'))) {
      return aiStockHistoryRange(current.get('aiStockHistoryRange'));
    }
    return aiStockHistoryRange(workspace.getConfiguration('leek-fund').get('aiStockHistoryRange', '6m'));
  }

  async setAiStockHistoryRange(range: AiStockHistoryRange): Promise<void> {
    await this.write('aiStockHistoryRange', range);
  }

  getShowPortfolio(): boolean {
    const current = workspace.getConfiguration('tickerdock').inspect<boolean>('showPortfolio');
    if (hasExplicitValue(current)) return workspace.getConfiguration('tickerdock').get('showPortfolio', true);
    const legacy = workspace.getConfiguration('leek-fund');
    return legacy.get<number>('showEarnings', 1) !== 0 && !legacy.get<boolean>('hideStatusBar', false);
  }

  async setShowPortfolio(visible: boolean): Promise<void> {
    await Promise.all([
      this.write('showPortfolio', visible),
      this.write('showStockPortfolioStatusBar', visible),
      this.write('showFundPortfolioStatusBar', visible),
    ]);
  }

  getShowStockPortfolioStatusBar(): boolean {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<boolean>('showStockPortfolioStatusBar'))) {
      return current.get('showStockPortfolioStatusBar', true);
    }
    return this.getShowPortfolio();
  }

  async setShowStockPortfolioStatusBar(visible: boolean): Promise<void> {
    await this.write('showStockPortfolioStatusBar', visible);
  }

  getShowFundPortfolioStatusBar(): boolean {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<boolean>('showFundPortfolioStatusBar'))) {
      return current.get('showFundPortfolioStatusBar', true);
    }
    if (!this.getShowPortfolio()) return false;
    return true;
  }

  async setShowFundPortfolioStatusBar(visible: boolean): Promise<void> {
    await this.write('showFundPortfolioStatusBar', visible);
  }

  async repairLegacyFundPortfolioVisibility(): Promise<boolean> {
    const current = workspace.getConfiguration('tickerdock');
    const legacy = workspace.getConfiguration('leek-fund');
    const incorrectlyHidden = current.get<boolean>('showFundPortfolioStatusBar', true) === false
      && legacy.get<boolean>('hideFundBarItem', false)
      && legacy.get<number>('showEarnings', 1) !== 0
      && !legacy.get<boolean>('hideStatusBar', false);
    if (!incorrectlyHidden) return false;
    await this.write('showFundPortfolioStatusBar', true);
    return true;
  }

  getStatusBarStocks(defaultValue: string[]): string[] {
    return uniqueStrings(this.readCompatible<unknown>('statusBarStocks',
      workspace.getConfiguration('leek-fund').get<unknown>('statusBarStock', defaultValue)))
      .map(normalizeConfiguredStockCode).slice(0, 8);
  }

  async setStatusBarStocks(codes: readonly string[]): Promise<void> {
    await this.write('statusBarStocks', uniqueStrings(codes).slice(0, 8));
  }

  getShowMarketStatusBar(): boolean {
    const current = workspace.getConfiguration('tickerdock').inspect<boolean>('showMarketStatusBar');
    if (hasExplicitValue(current)) return workspace.getConfiguration('tickerdock').get('showMarketStatusBar', true);
    const legacy = workspace.getConfiguration('leek-fund');
    return !legacy.get<boolean>('hideStatusBar', false) && !legacy.get<boolean>('hideStatusBarStock', false);
  }

  async setShowMarketStatusBar(visible: boolean): Promise<void> {
    await this.write('showMarketStatusBar', visible);
  }

  getShowStatusBarIcons(): boolean {
    const current = workspace.getConfiguration('tickerdock').inspect<boolean>('showStatusBarIcons');
    if (hasExplicitValue(current)) return workspace.getConfiguration('tickerdock').get('showStatusBarIcons', true);
    return !workspace.getConfiguration('leek-fund').get<boolean>('hideStatusBarIcon', false);
  }

  async setShowStatusBarIcons(visible: boolean): Promise<void> {
    await this.write('showStatusBarIcons', visible);
  }

  getRemindersEnabled(): boolean {
    const current = workspace.getConfiguration('tickerdock').inspect<boolean>('remindersEnabled');
    if (hasExplicitValue(current)) return workspace.getConfiguration('tickerdock').get('remindersEnabled', true);
    return this.readCompatible<number>('stockRemindSwitch', 1) !== 0;
  }

  async setRemindersEnabled(enabled: boolean): Promise<void> {
    await this.write('remindersEnabled', enabled);
  }

  getStockReminders(): Map<string, StockReminderRule[]> {
    const raw = asRecord(this.readCompatible<unknown>('stocksRemind', {}));
    const result = new Map<string, StockReminderRule[]>();
    for (const [code, rawConfig] of Object.entries(raw)) {
      const config = asRecord(rawConfig);
      const rules: StockReminderRule[] = [];
      for (const value of stringArray(config.price)) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed === 0) continue;
        rules.push({ kind: 'price', direction: parsed > 0 ? 'above' : 'below', threshold: Math.abs(parsed) });
      }
      for (const value of stringArray(config.percent)) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed === 0) continue;
        rules.push({
          kind: 'changeRatio',
          direction: parsed > 0 ? 'above' : 'below',
          threshold: parsed > 0 ? parsed / 100 : -Math.abs(parsed) / 100,
        });
      }
      if (rules.length) result.set(code, rules);
    }
    return result;
  }

  async addStockReminder(code: string, rule: StockReminderRule): Promise<void> {
    const raw = asRecord(this.readCompatible<unknown>('stocksRemind', {}));
    const current = asRecord(raw[code]);
    const price = stringArray(current.price);
    const percent = stringArray(current.percent);
    const signedValue = rule.kind === 'price'
      ? rule.threshold * (rule.direction === 'above' ? 1 : -1)
      : rule.threshold * 100;
    const target = rule.kind === 'price' ? price : percent;
    target.push(`${signedValue >= 0 ? '+' : ''}${signedValue}`);
    raw[code] = { ...current, price: [...new Set(price)], percent: [...new Set(percent)] };
    await this.write('stocksRemind', raw);
  }

  async removeStockReminders(code: string): Promise<void> {
    const raw = asRecord(this.readCompatible<unknown>('stocksRemind', {}));
    delete raw[code];
    await this.write('stocksRemind', raw);
  }

  private readCompatible<T>(key: string, defaultValue: T): T {
    const current = workspace.getConfiguration('tickerdock');
    const inspected = current.inspect<T>(key);
    if (hasExplicitValue(inspected)) return current.get<T>(key, defaultValue);
    const beta = workspace.getConfiguration('stock-fund');
    if (hasExplicitValue(beta.inspect<T>(key))) return beta.get<T>(key, defaultValue);
    return workspace.getConfiguration('leek-fund').get<T>(key, defaultValue);
  }

  private getSortMode(key: string, legacyKey: string): SortMode {
    const current = workspace.getConfiguration('tickerdock');
    if (hasExplicitValue(current.inspect<string>(key))) return legacySortMode(current.get(key));
    const beta = workspace.getConfiguration('stock-fund');
    if (hasExplicitValue(beta.inspect<string>(key))) return legacySortMode(beta.get(key));
    return legacySortMode(workspace.getConfiguration('leek-fund').get(legacyKey, 0));
  }

  private async write(key: string, value: unknown): Promise<void> {
    await workspace.getConfiguration('tickerdock').update(key, value, ConfigurationTarget.Global);
  }
}

const MIGRATABLE_BETA_KEYS = [
  'stocks', 'stockGroups', 'stockLists', 'funds', 'fundGroups', 'interval',
  'marketHoursEnabled', 'stockChartMode', 'heldStockHighlightEnabled',
  'sidebarDisplayMode', 'stockLabelTemplate', 'fundLabelTemplate',
  'statusBarLabelTemplate', 'stockPortfolioTemplate', 'fundPortfolioTemplate',
  'changeIconStyle', 'useCustomStatusBarColors', 'riseColor', 'fallColor',
  'stockSortMode', 'fundSortMode', 'stockPrice', 'fundAmount', 'showPortfolio',
  'showStockPortfolioStatusBar', 'showFundPortfolioStatusBar', 'statusBarStocks',
  'showMarketStatusBar', 'showStatusBarIcons', 'stocksRemind', 'remindersEnabled',
  'binance', 'binanceSortMode', 'binanceInterval', 'forexInterval', 'newsInterval',
  'newsSources', 'importantNewsOnly', 'flashNewsOutputEnabled',
  'flashNewsNotificationsEnabled', 'sectors', 'aiBaseUrl', 'aiModel', 'aiApiMode',
  'aiStockHistoryRange',
] as const;

function hasExplicitValue<T>(inspected: {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
} | undefined): boolean {
  return inspected?.globalValue !== undefined
    || inspected?.workspaceValue !== undefined
    || inspected?.workspaceFolderValue !== undefined;
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim() !== ''))];
}

// Upgrade values written by the pre-prefix extension at the configuration
// boundary. All runtime APIs and newly persisted values remain canonical.
function normalizeConfiguredStockCode(value: string): string {
  const code = value.trim();
  const upper = code.toUpperCase();
  const indexCode = { '0DJI': 'USDJI', '0IXIC': 'USIXIC', '0INX': 'USINX' }[upper];
  if (indexCode) return indexCode;
  if (/^(SH|SZ|HK|US|HF)\w+$/.test(upper)) return upper;
  const match = /^(?:sh|sz|hk)(\d+)$/.exec(code);
  if (match) return `${code.slice(0, 2).toUpperCase()}${match[1]}`;
  const us = /^(?:usr_|gb_)([a-z0-9.^-]+)$/i.exec(code);
  if (us?.[1]) return `US${us[1].toUpperCase()}`;
  const future = /^(?:nf_|hf_)([a-z0-9]+)$/i.exec(code);
  if (future?.[1]) return `HF${future[1].toUpperCase()}`;
  return upper;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function aiStockHistoryRange(value: unknown): AiStockHistoryRange {
  return value === '1w' || value === '1m' || value === '3m' || value === '1y' ? value : '6m';
}
