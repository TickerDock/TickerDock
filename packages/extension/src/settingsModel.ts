export interface SettingsEntry {
  readonly label: string;
  readonly command: string;
  readonly icon: string;
}

export const SETTINGS_ENTRIES: readonly SettingsEntry[] = [
  { label: '\u97ed\u83dc\u4e2d\u5fc3', command: 'stock-fund.openLeekCenter', icon: 'home' },
  { label: 'AI 助手配置', command: 'stock-fund.configureAi', icon: 'sparkle' },
  { label: '\u4e2a\u6027\u5b9a\u5236', command: 'stock-fund.openPersonalization', icon: 'settings-gear' },
];
