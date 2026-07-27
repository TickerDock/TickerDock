import { describe, expect, it } from 'vitest';
import { buildStockIframeTargets } from '../src/stockIframePage';

describe('stock iframe page', () => {
  it('builds fixed EastMoney standard and chip-distribution URLs for A shares', () => {
    expect(buildStockIframeTargets('sh600519')).toEqual({
      standard: 'https://quote.eastmoney.com/basic/full.html?mcid=1.600519',
      chips: 'https://quote.eastmoney.com/basic/h5chart-iframe.html?code=600519&market=1',
    });
    expect(buildStockIframeTargets('sz000001').chips).toContain('code=000001&market=0');
    expect(buildStockIframeTargets('sh000001').chips).toBeUndefined();
    expect(buildStockIframeTargets('sz399001').chips).toBeUndefined();
  });

  it('maps HK, US, and futures without accepting arbitrary URLs', () => {
    expect(buildStockIframeTargets('hk00700').standard).toContain('mcid=116.00700');
    expect(buildStockIframeTargets('usr_aapl').standard).toContain('mcid=105.AAPL');
    expect(buildStockIframeTargets('nf_IF0').standard).toBe('https://finance.sina.com.cn/futures/quotes/IF0.shtml');
    expect(() => buildStockIframeTargets('https://evil.example')).toThrow('Unsupported stock trend code');
  });

  it('routes EastMoney stock pages through a supplied local proxy', () => {
    const targets = buildStockIframeTargets('sh600519', 'http://127.0.0.1:16100');
    expect(targets.standard).toBe('http://127.0.0.1:16100/basic/full.html?mcid=1.600519');
    expect(targets.chips).toBe('http://127.0.0.1:16100/basic/h5chart-iframe.html?code=600519&market=1');
  });

  it('builds a proxied EastMoney standard page for sectors', () => {
    expect(buildStockIframeTargets('BK0815', 'http://127.0.0.1:16100')).toEqual({
      standard: 'http://127.0.0.1:16100/basic/full.html?mcid=90.BK0815&type=r',
    });
  });

});


