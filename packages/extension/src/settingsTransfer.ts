import { legacyFundSortMode, legacySortMode } from './sortModel';
import { DEFAULT_PERSONALIZATION, normalizeLegacyColor, normalizePersonalization } from './personalizationModel';

export const SETTINGS_FORMAT = 'stock-fund-settings';
export const SETTINGS_VERSION = 1;

export const TRANSFERABLE_SETTING_KEYS = [
  'stocks',
  'stockGroups',
  'stockLists',
  'funds',
  'fundGroups',
  'interval',
  'marketHoursEnabled',
  'expandedStockMarkets',
  'stockChartMode',
  'heldStockHighlightEnabled',
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
  'stockSortMode',
  'fundSortMode',
  'stockPrice',
  'fundAmount',
  'showPortfolio',
  'showStockPortfolioStatusBar',
  'showFundPortfolioStatusBar',
  'statusBarStocks',
  'showMarketStatusBar',
  'showStatusBarIcons',
  'stocksRemind',
  'remindersEnabled',
  'binance',
  'binanceSortMode',
  'binanceInterval',
  'forexInterval',
  'newsInterval',
  'newsSources',
  'importantNewsOnly',
  'flashNewsOutputEnabled',
  'flashNewsNotificationsEnabled',
  'newsUserIds',
  'xueqiuInterval',
  'aiBaseUrl',
  'aiModel',
  'aiApiMode',
  'aiStockHistoryRange',
] as const;

export type TransferableSettingKey = typeof TRANSFERABLE_SETTING_KEYS[number];

export interface SettingsBundle {
  format: typeof SETTINGS_FORMAT;
  version: typeof SETTINGS_VERSION;
  exportedAt: string;
  settings: Record<string, unknown>;
}

export interface ParsedSettings {
  settings: Partial<Record<TransferableSettingKey, unknown>>;
  ignoredKeys: string[];
  legacy: boolean;
}

const KEY_SET = new Set<string>(TRANSFERABLE_SETTING_KEYS);
const SECRET_KEYS = new Set(['xueqiuCookie', 'aiApiKey']);

export function createSettingsBundle(
  settings: Partial<Record<TransferableSettingKey, unknown>>,
  exportedAt = new Date().toISOString()
): SettingsBundle {
  const output: Record<string, unknown> = {};
  for (const key of TRANSFERABLE_SETTING_KEYS) {
    if (settings[key] !== undefined) output[`stock-fund.${key}`] = settings[key];
  }
  return { format: SETTINGS_FORMAT, version: SETTINGS_VERSION, exportedAt, settings: output };
}

export function parseSettingsBundle(input: unknown): ParsedSettings {
  if (!isRecord(input)) throw new Error('The settings file must contain a JSON object.');
  const isBundle = input.format === SETTINGS_FORMAT;
  if (isBundle && input.version !== SETTINGS_VERSION) {
    throw new Error(`Unsupported settings version: ${String(input.version)}.`);
  }
  const source = isBundle ? input.settings : input;
  if (!isRecord(source)) throw new Error('The settings payload must contain a JSON object.');

  const settings: Partial<Record<TransferableSettingKey, unknown>> = {};
  const ignoredKeys: string[] = [];
  const invalidKeys: string[] = [];
  let legacy = false;
  let legacyHideAll = false;
  let legacyExpandedStockGroups: Set<string> | undefined;
  let legacyAppearance = false;

  for (const [fullKey, value] of Object.entries(source)) {
    const parsedKey = splitKey(fullKey);
    if (!parsedKey) {
      ignoredKeys.push(fullKey);
      continue;
    }
    legacy ||= parsedKey.namespace === 'leek-fund';
    if (SECRET_KEYS.has(parsedKey.key)) {
      ignoredKeys.push(fullKey);
      continue;
    }
    if (parsedKey.namespace === 'leek-fund' && parsedKey.key === 'aiConfig') {
      importLegacyAiConfig(value, settings, invalidKeys);
      ignoredKeys.push(`${fullKey}.apiKey`);
      continue;
    }
    if (parsedKey.namespace === 'leek-fund' && parsedKey.key === 'labelFormat') {
      importLegacyLabelFormat(value, settings, invalidKeys);
      settings.sidebarDisplayMode = 'template';
      continue;
    }
    if (parsedKey.namespace === 'leek-fund' && (parsedKey.key === 'riseColor' || parsedKey.key === 'fallColor')) {
      legacyAppearance = true;
    }
    if (parsedKey.namespace === 'leek-fund' && parsedKey.key === 'hideStatusBar') {
      if (typeof value !== 'boolean') invalidKeys.push(fullKey);
      else legacyHideAll ||= value;
      continue;
    }
    const legacyStockGroup = legacyExpandedStockGroup(parsedKey.namespace, parsedKey.key);
    if (legacyStockGroup) {
      if (typeof value !== 'boolean') invalidKeys.push(fullKey);
      else {
        legacyExpandedStockGroups ??= new Set<string>();
        if (value) legacyExpandedStockGroups.add(legacyStockGroup);
      }
      continue;
    }
    const mapped = mapLegacyKey(parsedKey.namespace, parsedKey.key, value);
    if (!mapped || !KEY_SET.has(mapped.key)) {
      ignoredKeys.push(fullKey);
      continue;
    }
    if (!isValidSetting(mapped.key as TransferableSettingKey, mapped.value)) {
      invalidKeys.push(fullKey);
      continue;
    }
    settings[mapped.key as TransferableSettingKey] = mapped.value;
  }

  if (invalidKeys.length > 0) throw new Error(`Invalid settings: ${invalidKeys.join(', ')}.`);
  if (legacyHideAll) {
    settings.showPortfolio = false;
    settings.showMarketStatusBar = false;
  }
  if (legacyExpandedStockGroups) settings.expandedStockMarkets = [...legacyExpandedStockGroups];
  if (legacyAppearance) settings.useCustomStatusBarColors = true;
  if (isStringArray(settings.stocks)
    && (!Array.isArray(settings.stockLists) || settings.stockLists.length === 0)) {
    settings.stockGroups = ['My Stocks'];
    settings.stockLists = [settings.stocks];
  }
  if (Object.keys(settings).length === 0) throw new Error('No supported settings were found.');
  return { settings, ignoredKeys: [...new Set(ignoredKeys)], legacy };
}

function splitKey(fullKey: string): { namespace: 'stock-fund' | 'leek-fund'; key: string } | undefined {
  if (fullKey.startsWith('stock-fund.')) return { namespace: 'stock-fund', key: fullKey.slice(11) };
  if (fullKey.startsWith('leek-fund.')) return { namespace: 'leek-fund', key: fullKey.slice(10) };
  return undefined;
}

function mapLegacyKey(
  namespace: 'stock-fund' | 'leek-fund',
  key: string,
  value: unknown
): { key: string; value: unknown } | undefined {
  if (namespace === 'leek-fund' && key === 'showEarnings') {
    return { key: 'showPortfolio', value: value !== 0 };
  }
  if (namespace === 'leek-fund' && key === 'stockRemindSwitch') {
    return { key: 'remindersEnabled', value: value !== 0 };
  }
  if (namespace === 'leek-fund' && key === 'statusBarStock') {
    return { key: 'statusBarStocks', value };
  }
  if (namespace === 'leek-fund' && key === 'hideStatusBarStock') {
    return { key: 'showMarketStatusBar', value: typeof value === 'boolean' ? !value : value };
  }
  if (namespace === 'leek-fund' && key === 'hideFundBarItem') {
    return undefined;
  }
  if (namespace === 'leek-fund' && key === 'hideStatusBarIcon') {
    return { key: 'showStatusBarIcons', value: typeof value === 'boolean' ? !value : value };
  }
  if (namespace === 'leek-fund' && key === 'stockSort') {
    return { key: 'stockSortMode', value: legacySortMode(value) };
  }
  if (namespace === 'leek-fund' && key === 'stockKLineChartSwitch') {
    return { key: 'stockChartMode', value: value === 1 ? 'chips' : value === 0 ? 'standard' : value };
  }
  if (namespace === 'leek-fund' && key === 'stockHeldTipShow') {
    return { key: 'heldStockHighlightEnabled', value };
  }
  if (namespace === 'leek-fund' && key === 'iconType') {
    return {
      key: 'changeIconStyle',
      value,
    };
  }
  if (namespace === 'leek-fund' && key === 'riseColor') {
    return { key: 'riseColor', value: normalizeLegacyColor(value, DEFAULT_PERSONALIZATION.riseColor) };
  }
  if (namespace === 'leek-fund' && key === 'fallColor') {
    return { key: 'fallColor', value: normalizeLegacyColor(value, DEFAULT_PERSONALIZATION.fallColor) };
  }
  if (namespace === 'leek-fund' && key === 'fundSort') {
    return { key: 'fundSortMode', value: legacyFundSortMode(value) };
  }
  if (namespace === 'leek-fund' && key === 'binanceSort') {
    return { key: 'binanceSortMode', value: legacySortMode(value) };
  }
  if (namespace === 'leek-fund' && key === 'flash-news') {
    return { key: 'flashNewsOutputEnabled', value };
  }
  return { key, value };
}

function legacyExpandedStockGroup(
  namespace: 'stock-fund' | 'leek-fund',
  key: string
): string | undefined {
  if (namespace !== 'leek-fund') return undefined;
  return ({
    expandAStock: 'cn-stock',
    expandHKStock: 'hk-stock',
    expandUSStock: 'us-stock',
    expandCNFuture: 'cn-future',
    expandOverseaFuture: 'global-future',
  } as Record<string, string>)[key];
}

function importLegacyAiConfig(
  value: unknown,
  settings: Partial<Record<TransferableSettingKey, unknown>>,
  invalidKeys: string[]
): void {
  if (!isRecord(value)) {
    invalidKeys.push('leek-fund.aiConfig');
    return;
  }
  if (typeof value.baseUrl === 'string' && value.baseUrl.trim()) settings.aiBaseUrl = value.baseUrl;
  if (typeof value.model === 'string' && value.model.trim()) settings.aiModel = value.model;
}

function importLegacyLabelFormat(
  value: unknown,
  settings: Partial<Record<TransferableSettingKey, unknown>>,
  invalidKeys: string[]
): void {
  if (!isRecord(value)) {
    invalidKeys.push('leek-fund.labelFormat');
    return;
  }
  const normalized = normalizePersonalization({
    stockLabelTemplate: value.sidebarStockLabelFormat as string,
    fundLabelTemplate: value.sidebarFundLabelFormat as string,
    statusBarLabelTemplate: value.statusBarLabelFormat as string,
  });
  settings.stockLabelTemplate = normalized.stockLabelTemplate;
  settings.fundLabelTemplate = normalized.fundLabelTemplate;
  settings.statusBarLabelTemplate = normalized.statusBarLabelTemplate;
}

function isValidSetting(key: TransferableSettingKey, value: unknown): boolean {
  switch (key) {
    case 'stocks':
    case 'stockGroups':
    case 'fundGroups':
    case 'binance':
      return isStringArray(value);
    case 'statusBarStocks':
      return isStringArray(value) && value.length <= 8 && new Set(value).size === value.length;
    case 'newsUserIds':
      return isStringArray(value) && value.every((item) => /^\d+$/.test(item));
    case 'funds':
    case 'stockLists':
      return Array.isArray(value) && value.every(isStringArray);
    case 'interval':
      return isNumberAtLeast(value, 3000);
    case 'binanceInterval':
      return isNumberAtLeast(value, 5000);
    case 'forexInterval':
      return isNumberAtLeast(value, 300000);
    case 'newsInterval':
      return isNumberAtLeast(value, 10000);
    case 'xueqiuInterval':
      return isNumberAtLeast(value, 30000);
    case 'stockPrice':
    case 'fundAmount':
    case 'stocksRemind':
      return isRecord(value);
    case 'showPortfolio':
    case 'showStockPortfolioStatusBar':
    case 'showFundPortfolioStatusBar':
    case 'remindersEnabled':
    case 'importantNewsOnly':
    case 'flashNewsOutputEnabled':
    case 'flashNewsNotificationsEnabled':
    case 'marketHoursEnabled':
    case 'showMarketStatusBar':
    case 'showStatusBarIcons':
    case 'heldStockHighlightEnabled':
    case 'useCustomStatusBarColors':
      return typeof value === 'boolean';
    case 'sidebarDisplayMode':
      return value === 'standard' || value === 'template';
    case 'changeIconStyle':
      return value === 'arrow' || value === 'arrow1' || value === 'food1' || value === 'food2'
        || value === 'food3' || value === 'iconfood' || value === 'none';
    case 'stockLabelTemplate':
    case 'fundLabelTemplate':
    case 'statusBarLabelTemplate':
    case 'stockPortfolioTemplate':
    case 'fundPortfolioTemplate':
      return typeof value === 'string'
        && normalizePersonalization({ stockLabelTemplate: value }).stockLabelTemplate === value;
    case 'riseColor':
    case 'fallColor':
      return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
    case 'newsSources':
      return Array.isArray(value)
        && value.every((item) => item === 'jin10' || item === 'xuangubao')
        && new Set(value).size === value.length;
    case 'expandedStockMarkets':
      return Array.isArray(value)
        && value.every((item) => item === 'cn-stock' || item === 'hk-stock' || item === 'us-stock'
          || item === 'cn-future' || item === 'global-future')
        && new Set(value).size === value.length;
    case 'aiBaseUrl':
    case 'aiModel':
      return typeof value === 'string' && value.trim().length > 0;
    case 'aiApiMode':
      return value === 'responses' || value === 'chat-completions';
    case 'stockChartMode':
      return value === 'standard' || value === 'chips';
    case 'aiStockHistoryRange':
      return value === '1w' || value === '1m' || value === '3m' || value === '6m' || value === '1y';
    case 'stockSortMode':
    case 'binanceSortMode':
      return value === 'original' || value === 'ascending' || value === 'descending';
    case 'fundSortMode':
      return value === 'original' || value === 'ascending' || value === 'descending'
        || value === 'amount-ascending' || value === 'amount-descending';
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNumberAtLeast(value: unknown, minimum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
