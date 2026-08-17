import { describe, expect, it } from 'vitest';
import { createSettingsBundle, parseSettingsBundle } from '../src/settingsTransfer';

describe('settings transfer', () => {
  it('exports only allowlisted non-secret settings', () => {
    const bundle = createSettingsBundle({ stocks: ['sh000001'], aiModel: 'model' }, '2026-07-16T00:00:00.000Z');
    expect(bundle).toEqual({
      format: 'tickerdock-settings',
      version: 1,
      exportedAt: '2026-07-16T00:00:00.000Z',
      settings: { 'tickerdock.stocks': ['sh000001'], 'tickerdock.aiModel': 'model' },
    });
    expect(JSON.stringify(bundle)).not.toMatch(/cookie|apiKey/i);
  });

  it('imports a versioned bundle', () => {
    const parsed = parseSettingsBundle(createSettingsBundle({
      stocks: ['hk00700'], aiApiMode: 'responses', newsInterval: 15000,
    }));
    expect(parsed.settings).toEqual({
      stocks: ['hk00700'], stockGroups: ['My Stocks'], stockLists: [['hk00700']],
      aiApiMode: 'responses', newsInterval: 15000,
    });
    expect(parsed.legacy).toBe(false);
  });

  it('imports stock-fund beta bundles as legacy data', () => {
    const parsed = parseSettingsBundle({
      format: 'stock-fund-settings',
      version: 1,
      exportedAt: '2026-07-16T00:00:00.000Z',
      settings: { 'stock-fund.stocks': ['SH600519'] },
    });
    expect(parsed.settings.stocks).toEqual(['SH600519']);
    expect(parsed.legacy).toBe(true);
  });

  it('maps legacy compatibility settings and excludes credentials', () => {
    const parsed = parseSettingsBundle({
      'leek-fund.stocks': ['sh600519'],
      'leek-fund.showEarnings': 0,
      'leek-fund.stockRemindSwitch': 1,
      'leek-fund.statusBarStock': ['sh000001', 'hk00700'],
      'leek-fund.hideStatusBarStock': true,
      'leek-fund.hideFundBarItem': true,
      'leek-fund.hideStatusBarIcon': true,
      'leek-fund.stockSort': -1,
      'leek-fund.stockKLineChartSwitch': 1,
      'leek-fund.stockHeldTipShow': false,
      'leek-fund.iconType': 'food1',
      'leek-fund.riseColor': 'white',
      'leek-fund.fallColor': '#C9AD06',
      'leek-fund.labelFormat': {
        sidebarStockLabelFormat: '${percent} ${price} ${name}',
        sidebarFundLabelFormat: '${percent} ${name} ${earnings}',
        statusBarLabelFormat: '${icon}${name} ${price}',
      },
      'leek-fund.fundSort': -2,
      'leek-fund.binanceSort': 0,
      'leek-fund.flash-news': true,
      'leek-fund.xueqiuCookie': 'secret',
      'leek-fund.aiConfig': { apiKey: 'secret', baseUrl: 'https://gateway.example/v1', model: 'legacy-model' },
      'leek-fund.aiStockHistoryRange': '1y',
      'leek-fund.expandAStock': false,
      'leek-fund.expandHKStock': true,
      'leek-fund.expandUSStock': true,
    });
    expect(parsed.settings).toEqual({
      stocks: ['sh600519'], stockGroups: ['My Stocks'], stockLists: [['sh600519']],
      showPortfolio: false, remindersEnabled: true,
      statusBarStocks: ['sh000001', 'hk00700'], showMarketStatusBar: false,
      showStatusBarIcons: false,
      stockSortMode: 'descending', stockChartMode: 'chips',
      heldStockHighlightEnabled: false,
      sidebarDisplayMode: 'template',
      stockLabelTemplate: '${percent} ${price} ${name}',
      fundLabelTemplate: '${percent} ${name} ${earnings}',
      statusBarLabelTemplate: '${icon}${name} ${price}',
      changeIconStyle: 'food1', useCustomStatusBarColors: true,
      riseColor: '#ffffff', fallColor: '#c9ad06',
      fundSortMode: 'amount-descending', binanceSortMode: 'original',
      flashNewsOutputEnabled: true,
      aiBaseUrl: 'https://gateway.example/v1', aiModel: 'legacy-model',
      aiStockHistoryRange: '1y',
      expandedStockMarkets: ['hk-stock', 'us-stock'],
    });
    expect(parsed.ignoredKeys).toContain('leek-fund.xueqiuCookie');
    expect(parsed.ignoredKeys).toContain('leek-fund.hideFundBarItem');
    expect(parsed.ignoredKeys).toContain('leek-fund.aiConfig.apiKey');
    expect(parsed.legacy).toBe(true);
  });

  it('rejects invalid known values instead of partially accepting them', () => {
    expect(() => parseSettingsBundle({
      'tickerdock.stocks': ['sh000001'],
      'tickerdock.interval': 100,
    })).toThrow('tickerdock.interval');
    expect(() => parseSettingsBundle({
      'tickerdock.marketStatusBarInterval': 2999,
    })).toThrow('tickerdock.marketStatusBarInterval');
    expect(() => parseSettingsBundle({
      'tickerdock.portfolioStatusBarInterval': 2999,
    })).toThrow('tickerdock.portfolioStatusBarInterval');
  });

  it('round-trips independent status bar refresh intervals', () => {
    const parsed = parseSettingsBundle(createSettingsBundle({
      marketStatusBarInterval: 5000,
      portfolioStatusBarInterval: 10000,
    }));
    expect(parsed.settings).toMatchObject({
      marketStatusBarInterval: 5000,
      portfolioStatusBarInterval: 10000,
    });
  });

  it('round-trips custom stock groups and validates nested stock lists', () => {
    const parsed = parseSettingsBundle(createSettingsBundle({
      stocks: ['sh600519', 'usr_aapl'],
      stockGroups: ['A Shares', 'US'],
      stockLists: [['sh600519'], ['usr_aapl']],
    }));
    expect(parsed.settings).toMatchObject({
      stockGroups: ['A Shares', 'US'],
      stockLists: [['sh600519'], ['usr_aapl']],
    });
    expect(() => parseSettingsBundle({ 'tickerdock.stockLists': ['sh600519'] }))
      .toThrow('tickerdock.stockLists');
  });

  it('rejects unsupported versions', () => {
    expect(() => parseSettingsBundle({ format: 'stock-fund-settings', version: 2, settings: {} }))
      .toThrow('Unsupported settings version');
  });

  it('rejects more than four status bar stocks', () => {
    expect(() => parseSettingsBundle({
      'tickerdock.statusBarStocks': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    })).toThrow('tickerdock.statusBarStocks');
  });

  it('validates AI history ranges and fund amount sorting', () => {
    expect(parseSettingsBundle({
      'tickerdock.fundSortMode': 'amount-ascending',
      'tickerdock.aiStockHistoryRange': '3m',
    }).settings).toEqual({ fundSortMode: 'amount-ascending', aiStockHistoryRange: '3m' });
    expect(() => parseSettingsBundle({
      'tickerdock.aiStockHistoryRange': '2y',
    })).toThrow('tickerdock.aiStockHistoryRange');
  });

  it('imports independent portfolio status-bar visibility', () => {
    const settings = parseSettingsBundle({
      'tickerdock.showStockPortfolioStatusBar': false,
      'tickerdock.showFundPortfolioStatusBar': true,
    }).settings;
    expect(settings).toMatchObject({
      showStockPortfolioStatusBar: false,
      showFundPortfolioStatusBar: true,
    });
  });

  it('validates personalization settings', () => {
    expect(parseSettingsBundle({
      'tickerdock.sidebarDisplayMode': 'template',
      'tickerdock.stockLabelTemplate': '${code} ${name}',
      'tickerdock.riseColor': '#AA1122',
    }).settings).toMatchObject({
      sidebarDisplayMode: 'template', stockLabelTemplate: '${code} ${name}', riseColor: '#AA1122',
    });
    expect(() => parseSettingsBundle({
      'tickerdock.statusBarLabelTemplate': '${unknown}',
    })).toThrow('tickerdock.statusBarLabelTemplate');
  });

  it('applies the legacy global status bar hide regardless of key order', () => {
    expect(parseSettingsBundle({
      'leek-fund.hideStatusBar': true,
      'leek-fund.hideStatusBarStock': false,
      'leek-fund.showEarnings': 1,
    }).settings).toMatchObject({ showPortfolio: false, showMarketStatusBar: false });
  });
});


