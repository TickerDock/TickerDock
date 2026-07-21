export type SidebarDisplayMode = 'standard' | 'template';
export type ChangeIconStyle = 'arrow' | 'arrow1' | 'food1' | 'food2' | 'food3' | 'iconfood' | 'none';

export interface PersonalizationConfig {
  sidebarDisplayMode: SidebarDisplayMode;
  stockLabelTemplate: string;
  fundLabelTemplate: string;
  statusBarLabelTemplate: string;
  stockPortfolioTemplate: string;
  fundPortfolioTemplate: string;
  changeIconStyle: ChangeIconStyle;
  useCustomStatusBarColors: boolean;
  riseColor: string;
  fallColor: string;
}

export const DEFAULT_PERSONALIZATION: PersonalizationConfig = {
  sidebarDisplayMode: 'standard',
  stockLabelTemplate: '${icon|padRight|3}${percent|padRight|9}${price|padRight|12}${name}',
  fundLabelTemplate: '${icon|padRight|3}${percent|padRight|9}${nav|padRight|12}${name} ${earnings}',
  statusBarLabelTemplate: '${icon}${name} ${price} ${percent}',
  stockPortfolioTemplate: '${icon}${name} ${currency} ${totalProfit} | 今日 ${todayProfit}${warning}',
  fundPortfolioTemplate: '${icon}${name} ${currency} ${totalProfit} | 今日 ${todayProfit}${warning}',
  changeIconStyle: 'arrow',
  useCustomStatusBarColors: false,
  riseColor: '#e05252',
  fallColor: '#3fa66b',
};

const PLACEHOLDERS = new Set([
  'icon', 'name', 'code', 'price', 'nav', 'percent', 'change', 'earnings', 'time',
  'currency', 'marketValue', 'costBasis', 'totalProfit', 'totalPercent',
  'todayProfit', 'todayPercent', 'warning',
]);
const TOKEN = /\$\{([a-zA-Z]+)(?:\|(padLeft|padRight)\|(\d{1,2}))?\}/g;
const SINGLE_TOKEN = /^\$\{([a-zA-Z]+)(?:\|(padLeft|padRight)\|(\d{1,2}))?\}$/;

export function normalizePersonalization(value: Partial<PersonalizationConfig>): PersonalizationConfig {
  return {
    sidebarDisplayMode: value.sidebarDisplayMode === 'template' ? 'template' : 'standard',
    stockLabelTemplate: validTemplate(value.stockLabelTemplate) ?? DEFAULT_PERSONALIZATION.stockLabelTemplate,
    fundLabelTemplate: validTemplate(value.fundLabelTemplate) ?? DEFAULT_PERSONALIZATION.fundLabelTemplate,
    statusBarLabelTemplate: validTemplate(value.statusBarLabelTemplate) ?? DEFAULT_PERSONALIZATION.statusBarLabelTemplate,
    stockPortfolioTemplate: validTemplate(value.stockPortfolioTemplate) ?? DEFAULT_PERSONALIZATION.stockPortfolioTemplate,
    fundPortfolioTemplate: validTemplate(value.fundPortfolioTemplate) ?? DEFAULT_PERSONALIZATION.fundPortfolioTemplate,
    changeIconStyle: isChangeIconStyle(value.changeIconStyle) ? value.changeIconStyle : 'arrow',
    useCustomStatusBarColors: value.useCustomStatusBarColors === true,
    riseColor: validColor(value.riseColor) ?? DEFAULT_PERSONALIZATION.riseColor,
    fallColor: validColor(value.fallColor) ?? DEFAULT_PERSONALIZATION.fallColor,
  };
}

export function validatePersonalization(value: unknown): PersonalizationConfig {
  if (!isRecord(value)) throw new Error('Personalization payload must be an object.');
  const requiredStrings = [
    'stockLabelTemplate', 'fundLabelTemplate', 'statusBarLabelTemplate',
    'stockPortfolioTemplate', 'fundPortfolioTemplate',
  ] as const;
  for (const key of requiredStrings) {
    if (validTemplate(value[key]) === undefined) throw new Error(`Invalid ${key}.`);
  }
  if (value.sidebarDisplayMode !== 'standard' && value.sidebarDisplayMode !== 'template') {
    throw new Error('Invalid sidebarDisplayMode.');
  }
  if (!isChangeIconStyle(value.changeIconStyle)) {
    throw new Error('Invalid changeIconStyle.');
  }
  if (typeof value.useCustomStatusBarColors !== 'boolean') throw new Error('Invalid color toggle.');
  if (!validColor(value.riseColor) || !validColor(value.fallColor)) throw new Error('Colors must use #RRGGBB.');
  return normalizePersonalization(value as Partial<PersonalizationConfig>);
}

export function renderTemplate(
  template: string,
  values: Partial<Record<string, string | number | undefined>>
): string {
  return template.replace(TOKEN, (_token, key: string, operation?: string, widthText?: string) => {
    let output = values[key] === undefined ? '' : String(values[key]);
    const width = Math.min(Number(widthText) || 0, 40);
    if (operation === 'padLeft') output = output.padStart(width);
    if (operation === 'padRight') output = output.padEnd(width);
    return output;
  }).trimEnd().slice(0, 240);
}

export function changeIcon(ratio: number, style: ChangeIconStyle): string {
  if (style === 'none') return '';
  if (style === 'food1' || style === 'iconfood') return ratio >= 0 ? '\u{1f357}' : '\u{1f35c}';
  if (style === 'food2') return ratio >= 0 ? '\u{1f362}' : '\u{1f96c}';
  if (style === 'food3') return ratio >= 0 ? '\u{1f377}' : '\u{1f35c}';
  return ratio >= 0 ? '\u{1f4c8}' : '\u{1f4c9}';
}

export function changeTextIcon(ratio: number, style: ChangeIconStyle): string {
  if (style === 'food1' || style === 'iconfood') return ratio >= 0 ? '\u{1f357}' : '\u{1f35c}';
  if (style === 'food2') return ratio >= 0 ? '\u{1f362}' : '\u{1f96c}';
  if (style === 'food3') return ratio >= 0 ? '\u{1f377}' : '\u{1f35c}';
  return '';
}

export function quoteIconFile(ratio: number, style: ChangeIconStyle): string | undefined {
  const rising = ratio >= 0;
  const strong = Math.abs(ratio) >= 0.02;
  if (style === 'arrow') return rising ? strong ? 'up.svg' : 'up1.svg' : strong ? 'down.svg' : 'down1.svg';
  if (style === 'arrow1') return rising ? strong ? 'up2.svg' : 'up3.svg' : strong ? 'down2.svg' : 'down3.svg';
  if (style === 'food1') return rising ? 'meat2.svg' : 'noodles.svg';
  if (style === 'food2') return rising ? 'kabob.svg' : 'bakeleek.svg';
  if (style === 'food3') return rising ? 'wine.svg' : 'noodles.svg';
  return undefined;
}

export function normalizeLegacyColor(value: unknown, fallback: string): string {
  const direct = validColor(value);
  if (direct) return direct;
  if (typeof value !== 'string') return fallback;
  return ({
    white: '#ffffff',
    red: '#e05252',
    green: '#3fa66b',
    yellow: '#c9ad06',
    orange: '#d18616',
    blue: '#3794ff',
  } as Record<string, string>)[value.toLowerCase()] ?? fallback;
}

function validTemplate(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 240 || /[\r\n\u0000-\u001f]/.test(value)) {
    return undefined;
  }
  const candidates = [...value.matchAll(/\$\{[^}]+\}/g)];
  if (value.replace(/\$\{[^}]+\}/g, '').includes('${')) return undefined;
  for (const matched of candidates) {
    const parsed = SINGLE_TOKEN.exec(matched[0]);
    if (!parsed || !PLACEHOLDERS.has(parsed[1]!)) return undefined;
  }
  return value;
}

function validColor(value: unknown): string | undefined {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : undefined;
}

function isChangeIconStyle(value: unknown): value is ChangeIconStyle {
  return value === 'arrow' || value === 'arrow1' || value === 'food1' || value === 'food2'
    || value === 'food3' || value === 'iconfood' || value === 'none';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
