import { describe, expect, it } from 'vitest';
import {
  calculateFundProfit,
  calculateStockProfit,
  createCnyFxRates,
  fromStockApiCode,
  evaluateStockReminders,
  marketFromLegacyCode,
  mergeFundEstimates,
  summarizePortfolio,
  toStockApiCode,
  UnsupportedMarketError,
} from './index';

describe('strict stock code mapping', () => {
  it.each([
    ['SH600519', 'SH600519'], ['SZ000001', 'SZ000001'], ['HK00700', 'HK00700'], ['HKHSI', 'HKHSI'], ['HKHSTECH', 'HKHSTECH'], ['USAAPL', 'USAAPL'], ['USDJI', 'USDJI'], ['USIXIC', 'USIXIC'], ['USINX', 'USINX'], ['HFIF0', 'HFIF0'],
  ])('accepts %s as %s', (code, api) => {
    expect(toStockApiCode(code)).toBe(api);
  });

  it('rejects legacy lowercase and underscored formats', () => {
    expect(() => marketFromLegacyCode('sh600519')).toThrow(UnsupportedMarketError);
    expect(() => marketFromLegacyCode('nf_IF0')).toThrow(UnsupportedMarketError);
    expect(() => marketFromLegacyCode('0DJI')).toThrow(UnsupportedMarketError);
  });

  it.each([
    ['SH600519', 'SH600519'], ['HK00700', 'HK00700'], ['USDJI', 'USDJI'],
  ])('keeps API code %s canonical', (api, canonical) => {
    expect(fromStockApiCode(api)).toBe(canonical);
  });
});

describe('portfolio calculations', () => {
  const stockQuote = {
    code: 'SH600519', name: 'Moutai', market: 'sh' as const, price: 110,
    previousClose: 100, high: 112, low: 99, change: 10, changeRatio: 0.1,
    source: 'test', status: 'live' as const,
  };

  it('calculates stock total and daily profit', () => {
    const profit = calculateStockProfit(stockQuote, {
      code: stockQuote.code, quantity: 10, costPrice: 80,
    });
    expect(profit).toMatchObject({ marketValue: 1100, costBasis: 800, totalProfit: 300, todayProfit: 100 });
  });

  it('uses the exit price for a sold-out position', () => {
    const profit = calculateStockProfit(stockQuote, {
      code: stockQuote.code, quantity: 10, costPrice: 80, todayTradePrice: 105, soldOut: true,
    });
    expect(profit).toMatchObject({ marketValue: 0, totalProfit: 250, todayProfit: 50, realized: true });
  });

  it('calculates fund profit from confirmed NAV', () => {
    const profit = calculateFundProfit({
      code: '110022', name: 'Fund', nav: 2.2, accumulatedNav: 2.2,
      navDate: '2026-07-16', navChangeRatio: 0.1, source: 'test', status: 'live',
    }, { code: '110022', shares: 100, costNav: 1.5 });
    expect(profit?.costBasis).toBe(150);
    expect(profit?.marketValue).toBeCloseTo(220);
    expect(profit?.totalProfit).toBeCloseTo(70);
    expect(profit?.todayProfit).toBeCloseTo(20);
  });

  it('summarizes multiple positions', () => {
    const first = calculateStockProfit(stockQuote, { code: stockQuote.code, quantity: 10, costPrice: 80 });
    const second = calculateFundProfit({
      code: '110022', name: 'Fund', nav: 2, accumulatedNav: 2, navDate: '2026-07-16',
      navChangeRatio: 0, source: 'test', status: 'live',
    }, { code: '110022', shares: 100, costNav: 1.5 });
    const summary = summarizePortfolio([first!, second!]);
    expect(summary).toMatchObject({ marketValue: 1300, costBasis: 950, totalProfit: 350, todayProfit: 100 });
  });

  it('normalizes HKD and USD positions to CNY before aggregation', () => {
    const hk = calculateStockProfit({
      ...stockQuote, code: 'HK00700', name: 'Tencent', market: 'hk', price: 110,
    }, { code: 'HK00700', quantity: 10, costPrice: 80 })!;
    const us = calculateStockProfit({
      ...stockQuote, code: 'USAAPL', name: 'Apple', market: 'us', price: 110,
    }, { code: 'USAAPL', quantity: 10, costPrice: 80 })!;
    const summary = summarizePortfolio([hk, us], { CNY: 1, HKD: 0.92, USD: 7.2 });

    expect(hk.currency).toBe('HKD');
    expect(us.currency).toBe('USD');
    expect(summary.marketValue).toBeCloseTo(1100 * 0.92 + 1100 * 7.2);
    expect(summary.totalProfit).toBeCloseTo(300 * 0.92 + 300 * 7.2);
    expect(summary.excludedCurrencies).toEqual([]);
    expect(summary.positions.every(({ currency }) => currency === 'CNY')).toBe(true);
  });

  it('excludes foreign positions when their exchange rate is unavailable', () => {
    const hk = calculateStockProfit({
      ...stockQuote, code: 'HK00700', market: 'hk', price: 110,
    }, { code: 'HK00700', quantity: 10, costPrice: 80 })!;
    const summary = summarizePortfolio([hk], { CNY: 1 });

    expect(summary.marketValue).toBe(0);
    expect(summary.positions).toEqual([]);
    expect(summary.excludedCurrencies).toEqual(['HKD']);
  });

  it('creates CNY rates from Bank of China prices quoted per hundred units', () => {
    expect(createCnyFxRates([
      { name: '美元', spotSellPrice: 720, publishDate: '', publishTime: '', source: 'test' },
      { name: 'HKD', conversionPrice: 92, publishDate: '', publishTime: '', source: 'test' },
    ])).toEqual({ CNY: 1, USD: 7.2, HKD: 0.92 });
  });

  it('uses a current intraday estimate without replacing confirmed NAV', () => {
    const [quote] = mergeFundEstimates([{
      code: '110022', name: 'Fund', nav: 2, accumulatedNav: 2, navDate: '2026-07-15',
      navChangeRatio: 0.01, source: 'fund-api', status: 'live',
    }], [{
      code: '110022', estimatedNav: 2.1, estimatedChangeRatio: 0.05,
      estimateTime: '2026-07-16 14:30', confirmedNavDate: '2026-07-15', source: 'eastmoney-estimate',
    }]);
    expect(quote).toMatchObject({ nav: 2, estimatedNav: 2.1, estimatedChangeRatio: 0.05 });
  });
});

describe('stock reminders', () => {
  const quote = (price: number, changeRatio: number) => ({
    code: 'SH600519', name: 'Moutai', market: 'sh' as const, price, previousClose: 100,
    high: price, low: price, change: price - 100, changeRatio, source: 'test', status: 'live' as const,
  });

  it('triggers only when an upper threshold is crossed', () => {
    const rules = [{ kind: 'price' as const, direction: 'above' as const, threshold: 105 }];
    expect(evaluateStockReminders(quote(104, 0.04), quote(106, 0.06), rules)).toHaveLength(1);
    expect(evaluateStockReminders(quote(106, 0.06), quote(107, 0.07), rules)).toHaveLength(0);
  });

  it('supports lower percentage thresholds as ratios', () => {
    const rules = [{ kind: 'changeRatio' as const, direction: 'below' as const, threshold: -0.05 }];
    expect(evaluateStockReminders(quote(98, -0.02), quote(94, -0.06), rules)).toHaveLength(1);
  });
});

