import { describe, expect, it } from 'vitest';
import { createSettingsBundle, parseSettingsBundle } from '../src/settingsTransfer';

describe('settings transfer', () => {
  it('exports only allowlisted non-secret settings', () => {
    const bundle = createSettingsBundle({ stocks: ['sh000001'], aiModel: 'model' }, '2026-07-16T00:00:00.000Z');
    expect(bundle).toEqual({
      format: 'stock-fund-settings',
      version: 1,
      exportedAt: '2026-07-16T00:00:00.000Z',
      settings: { 'stock-fund.stocks': ['sh000001'], 'stock-fund.aiModel': 'model' },
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
      'stock-fund.stocks': ['sh000001'],
      'stock-fund.interval': 100,
    })).toThrow('stock-fund.interval');
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
    expect(() => parseSettingsBundle({ 'stock-fund.stockLists': ['sh600519'] }))
      .toThrow('stock-fund.stockLists');
  });

  it('rejects unsupported versions', () => {
    expect(() => parseSettingsBundle({ format: 'stock-fund-settings', version: 2, settings: {} }))
      .toThrow('Unsupported settings version');
  });

  it('rejects more than four status bar stocks', () => {
    expect(() => parseSettingsBundle({
      'stock-fund.statusBarStocks': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    })).toThrow('stock-fund.statusBarStocks');
  });

  it('validates AI history ranges and fund amount sorting', () => {
    expect(parseSettingsBundle({
      'stock-fund.fundSortMode': 'amount-ascending',
      'stock-fund.aiStockHistoryRange': '3m',
    }).settings).toEqual({ fundSortMode: 'amount-ascending', aiStockHistoryRange: '3m' });
    expect(() => parseSettingsBundle({
      'stock-fund.aiStockHistoryRange': '2y',
    })).toThrow('stock-fund.aiStockHistoryRange');
  });

  it('imports independent portfolio status-bar visibility', () => {
    const settings = parseSettingsBundle({
      'stock-fund.showStockPortfolioStatusBar': false,
      'stock-fund.showFundPortfolioStatusBar': true,
    }).settings;
    expect(settings).toMatchObject({
      showStockPortfolioStatusBar: false,
      showFundPortfolioStatusBar: true,
    });
  });

  it('validates personalization settings', () => {
    expect(parseSettingsBundle({
      'stock-fund.sidebarDisplayMode': 'template',
      'stock-fund.stockLabelTemplate': '${code} ${name}',
      'stock-fund.riseColor': '#AA1122',
    }).settings).toMatchObject({
      sidebarDisplayMode: 'template', stockLabelTemplate: '${code} ${name}', riseColor: '#AA1122',
    });
    expect(() => parseSettingsBundle({
      'stock-fund.statusBarLabelTemplate': '${unknown}',
    })).toThrow('stock-fund.statusBarLabelTemplate');
  });

  it('applies the legacy global status bar hide regardless of key order', () => {
    expect(parseSettingsBundle({
      'leek-fund.hideStatusBar': true,
      'leek-fund.hideStatusBarStock': false,
      'leek-fund.showEarnings': 1,
    }).settings).toMatchObject({ showPortfolio: false, showMarketStatusBar: false });
  });
});


