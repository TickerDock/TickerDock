import { describe, expect, it, vi } from 'vitest';
import {
  BinanceGateway,
  EastMoneyFundEstimateGateway,
  EastMoneyFundInsightsGateway,
  FundApiGateway,
  Jin10FlashNewsGateway,
  IwenCaiStockInsightsGateway,
  JiuyangongsheResearchGateway,
  CompositeFlashNewsGateway,
  parseHotMarketThemes,
  parseIwenCaiConcepts,
  parseIwenCaiDiagnosis,
  parseIwenCaiHotData,
  parseIwenCaiReports,
  parseMarketBreadth,
  parseStockConnectFlow,
  parseBocForexHtml,
  parseEastMoneyFundHoldings,
  parseEastMoneyFundDetailPage,
  parseEastMoneyFundDiagnosis,
  parseEastMoneyFundInstitutionRatings,
  SinaFuturesGateway,
  StockApiGateway,
  XuanGuBaoFlashNewsGateway,
  XueqiuGateway,
} from './index';

describe('StockApiGateway', () => {
  it('preserves requested order and stock-api ratio semantics', async () => {
    const client = {
      getStocks: async () => [
        { code: 'HK00700', name: 'Tencent', now: 500, yesterday: 490, high: 505, low: 488, percent: 0.020408, source: 'tencent' },
        { code: 'SH600519', name: 'Moutai', now: 1500, yesterday: 1470, high: 1510, low: 1460, percent: 0.020408, source: 'tencent' },
      ],
    };

    const gateway = new StockApiGateway(client as never);
    const quotes = await gateway.getQuotes(['sh600519', 'hk00700']);

    expect(quotes.map(({ code }) => code)).toEqual(['sh600519', 'hk00700']);
    expect(quotes[0]).toMatchObject({
      price: 1500,
      previousClose: 1470,
      change: 30,
      changeRatio: 0.020408,
      status: 'live',
    });
  });

  it('returns an explicit unavailable quote for a missing batch item', async () => {
    const client = { getStocks: async () => [] };
    const gateway = new StockApiGateway(client as never);

    await expect(gateway.getQuotes(['sz000001'])).resolves.toMatchObject([
      { code: 'sz000001', status: 'unavailable' },
    ]);
  });
});

describe('FundApiGateway', () => {
  it('normalizes percentage points to a ratio', async () => {
    const client = {
      getFunds: async () => [
        {
          code: '110022',
          name: 'Consumer Fund',
          nav: 2.84,
          accNav: 2.84,
          change: 3.2352,
          navDate: '2026-07-15',
          source: 'tencent',
        },
      ],
    };
    const gateway = new FundApiGateway(client as never);

    const [quote] = await gateway.getQuotes(['110022']);
    expect(quote?.navChangeRatio).toBeCloseTo(0.032352);
  });
});

describe('EastMoneyFundEstimateGateway', () => {
  it('parses JSONP estimates and normalizes percentage points', async () => {
    const request = async () => new Response(
      'jsonpgz({"fundcode":"110022","jzrq":"2026-07-15","gsz":"2.8400","gszzl":"3.2352","gztime":"2026-07-16 14:30"});'
    );
    const gateway = new EastMoneyFundEstimateGateway(request as typeof fetch);
    await expect(gateway.getEstimates(['110022'])).resolves.toEqual([{
      code: '110022', estimatedNav: 2.84, estimatedChangeRatio: 0.032352,
      estimateTime: '2026-07-16 14:30', confirmedNavDate: '2026-07-15', source: 'eastmoney-estimate',
    }]);
  });
});

describe('SinaFuturesGateway', () => {
  it('parses overseas futures quotes', async () => {
    const request = async () => new Response(
      'var hq_str_hf_OIL="105.306,,105.270,105.290,105.540,102.950,15:51:34,102.410,103.500,250168,5,2,2026-07-16,WTI Oil,28346";'
    );
    const gateway = new SinaFuturesGateway(request as typeof fetch);
    const [quote] = await gateway.getQuotes(['hf_OIL']);
    expect(quote).toMatchObject({
      code: 'hf_OIL', name: 'WTI Oil', price: 105.27, previousClose: 102.41,
      open: 103.5, high: 105.54, low: 102.95, market: 'global-future', status: 'live',
    });
  });
});

describe('BinanceGateway', () => {
  it('maps 24h ticker fields and percentage points', async () => {
    const request = async () => Response.json([{
      symbol: 'BTCUSDT', lastPrice: '65000', openPrice: '64000', prevClosePrice: '64000',
      highPrice: '66000', lowPrice: '63000', priceChange: '1000', priceChangePercent: '1.5625',
      volume: '10', quoteVolume: '650000',
    }]);
    const [quote] = await new BinanceGateway(request as typeof fetch).getQuotes(['BTC_USDT']);
    expect(quote).toMatchObject({ symbol: 'BTC_USDT', price: 65000, changeRatio: 0.015625, status: 'live' });
  });

  it('maps Binance K-line arrays and bounds the requested limit', async () => {
    let requestedUrl = '';
    const request = async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return Response.json([[0, '64000', '66000', '63000', '65000', '12.5']]);
    };
    const result = await new BinanceGateway(request as typeof fetch)
      .getKlines('BTC_USDT', { interval: '4h', limit: 1000 });
    expect(requestedUrl).toContain('symbol=BTCUSDT&interval=4h&limit=500');
    expect(result).toEqual([{
      date: '1970-01-01T00:00:00.000Z', open: 64000, high: 66000, low: 63000,
      close: 65000, volume: 12.5, source: 'binance',
    }]);
  });

  it('reuses the Binance pair catalog while filtering live-search terms', async () => {
    const request = vi.fn(async () => Response.json({ symbols: [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
    ] }));
    const gateway = new BinanceGateway(request as typeof fetch);
    await expect(gateway.searchPairs('btc')).resolves.toEqual([
      { code: 'BTC_USDT', name: 'BTC / USDT' },
    ]);
    await expect(gateway.searchPairs('eth')).resolves.toEqual([
      { code: 'ETH_USDT', name: 'ETH / USDT' },
    ]);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('parseBocForexHtml', () => {
  it('extracts structured quote cells', () => {
    const html = '<table></table><table><tr><td>USD</td><td>710</td><td>705</td><td>712</td><td>713</td><td>711</td><td>2026-07-16</td><td>16:00</td></tr></table>';
    expect(parseBocForexHtml(html)).toEqual([{
      name: 'USD', spotBuyPrice: 710, cashBuyPrice: 705, spotSellPrice: 712,
      cashSellPrice: 713, conversionPrice: 711, publishDate: '2026-07-16',
      publishTime: '16:00', source: 'bank-of-china',
    }]);
  });
});

describe('Jin10FlashNewsGateway', () => {
  it('normalizes regular news and economic data', async () => {
    const request = async () => Response.json({ status: 200, data: [
      { id: 'n1', important: 1, time: '2026-07-16 17:00:00', type: 0, data: { content: '<b>Market update</b>' } },
      { id: 'n2', important: 0, time: '2026-07-16 16:59:00', type: 1, data: { country: 'CN', time_period: 'June', name: 'CPI', actual: 1.2, unit: '%' } },
    ] });
    const result = await new Jin10FlashNewsGateway(request as typeof fetch).getLatest();
    expect(result).toMatchObject([
      { id: 'n1', title: 'Market update', important: true, kind: 'news' },
      { id: 'n2', title: 'CN June CPI: 1.2%', important: false, kind: 'economic-data' },
    ]);
  });
});

describe('XuanGuBaoFlashNewsGateway', () => {
  it('normalizes messages and constructs a fixed trusted detail URL', async () => {
    const request = async () => Response.json({ code: 20000, data: { messages: [{
      id: 123, title: '<b>Market update</b>', summary: 'Summary', impact: 1,
      created_at: 1000, route: 'https://malicious.example/',
    }] } });
    await expect(new XuanGuBaoFlashNewsGateway(request as typeof fetch).getLatest()).resolves.toEqual([{
      id: '123', title: 'Market update', summary: 'Summary', important: true,
      time: '1970-01-01T00:16:40.000Z', kind: 'news', source: 'xuangubao',
      url: 'https://xuangubao.cn/article/123',
    }]);
  });

  it('merges partial gateway results, deduplicates, and sorts newest first', async () => {
    const old = { id: '1', title: 'Old', summary: '', time: '2026-01-01T00:00:00Z', important: false, kind: 'news' as const, source: 'a' };
    const recent = { ...old, id: '2', title: 'Recent', time: '2026-01-02T00:00:00Z', source: 'b' };
    const gateway = new CompositeFlashNewsGateway([
      { getLatest: async () => [old, old] },
      { getLatest: async () => [recent] },
      { getLatest: async () => { throw new Error('offline'); } },
    ]);
    await expect(gateway.getLatest()).resolves.toEqual([recent, old]);
  });
});

describe('JiuyangongsheResearchGateway', () => {
  it('uses the current timestamp signature and normalizes trusted article links', async () => {
    let requestInit: RequestInit | undefined;
    const request = async (_input: string | URL | Request, init?: RequestInit) => {
      requestInit = init;
      return Response.json({ errCode: '0', data: { result: [{
        article_id: 'abc_123', title: '<b>Research title</b>',
        content: '<p>Research summary</p>', create_time: '2026-07-17 08:00:00',
      }] } });
    };
    const gateway = new JiuyangongsheResearchGateway(request as typeof fetch, () => 1234567890);
    await expect(gateway.search(' Example ', 50)).resolves.toEqual([{
      id: 'abc_123', title: 'Research title', summary: 'Research summary',
      time: '2026-07-17 08:00:00', source: 'jiuyangongshe',
      url: 'https://www.jiuyangongshe.com/a/abc_123',
    }]);
    expect(requestInit?.headers).toMatchObject({
      timestamp: '1234567890',
      token: 'f59a4c082607e324da47af8b8caad758',
      platform: '3',
    });
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ keyword: 'Example', limit: 20 });
  });
});

describe('IwenCaiStockInsightsGateway', () => {
  it('parses diagnosis, concepts, heat, official levels, and reports', () => {
    const table = (columns: string[], rows: unknown[][]) => ({ data: { result: { indexID: columns, result: rows } } });
    expect(parseIwenCaiHotData(table(
      ['个股热度', '止盈止损(压力位)', '止盈止损(支撑位)', '止盈止损(止盈位)', '止盈止损(止损位)'],
      [['12345', '110.00', '95.00', '115.00', '92.00']]
    ))).toEqual({ heat: '12345', pressure: '110.00', support: '95.00', takeProfit: '115.00', stopLoss: '92.00' });
    expect(parseIwenCaiDiagnosis({ data: { data: { result: {
      _title: '走势较强', _score: '7.2', _short: '短线强势', _mid: '中线震荡', _long: '长期向上', _content: '<b>关注风险</b>',
    } } } })).toEqual({ title: '走势较强', score: 7.2, short: '短线强势', mid: '中线震荡', long: '长期向上', content: '关注风险' });
    expect(parseIwenCaiConcepts({ data: { data: { result: [{ title: '白酒', content: '消费板块' }] } } })).toEqual([{ title: '白酒', content: '消费板块' }]);
    expect(parseIwenCaiReports(table(
      ['最新报告日期', '最新研究机构原始评级', '上次研究机构原始评级', '评级调整方向', '研报目标价', '研究员姓名', '最新同花顺评级'],
      [['2026-07-17', '买入', '增持', '上调', '120', 'Researcher', 'A']]
    ))).toEqual([{ reportDate: '2026-07-17', rating: '买入', previousRating: '增持', direction: '上调', targetPrice: '120', researcher: 'Researcher', iwencaiRating: 'A' }]);
  });

  it('uses only fixed endpoints and forwards a validated browser token', async () => {
    const urls: string[] = [];
    const headers: HeadersInit[] = [];
    const request = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      urls.push(url);
      headers.push(init?.headers ?? {});
      if (url.includes('block-detail')) return Response.json({ data: { data: { result: [] } } });
      return Response.json({ data: { result: { indexID: ['个股热度'], result: [['1']] } } });
    };
    const gateway = new IwenCaiStockInsightsGateway(request as typeof fetch);
    await expect(gateway.getInsights('sh600519', '贵州茅台', 'a'.repeat(32))).resolves.toMatchObject({ heat: '1' });
    expect(urls).toHaveLength(4);
    expect(new URL(urls[0]!).searchParams.get('w')).toBe('贵州茅台市场热度；撑压位');
    expect(urls.slice(1).some((url) => new URL(url).searchParams.get('w') === '贵州茅台机构评级')).toBe(true);
    expect(urls.every((url) => new URL(url).hostname === 'www.iwencai.com')).toBe(true);
    expect(headers.every((header) => (header as Record<string, string>)['hexin-v'] === 'a'.repeat(32))).toBe(true);
    await expect(gateway.getInsights('hk00700', 'Tencent', 'a'.repeat(32))).rejects.toThrow('A-share');
  });
});

describe('EastMoneyFundInsightsGateway', () => {
  it('parses the native fund holdings wrapper', () => {
    const body = 'var apidata={ content:"<div><font class=\'px12\'>2026-03-31</font><table><tbody><tr><td>1</td><td>600519</td><td>Moutai</td><td></td><td></td><td></td><td>9.90%</td><td>86.66</td><td>125,656.71</td></tr></tbody></table></div>",arryear:[]};';
    expect(parseEastMoneyFundHoldings(body)).toEqual([{
      code: '600519', name: 'Moutai', navRatio: 0.099, sharesWan: 86.66,
      marketValueWan: 125656.71, reportDate: '2026-03-31',
    }]);
  });

  it('normalizes ranking and fund flow payloads', async () => {
    const request = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('FundMNRank')) {
        return Response.json({ Datas: [{
          FCODE: '110022', SHORTNAME: 'Fund', DWJZ: '2.8', FSRQ: '2026-07-15',
          RZDF: '3.2', SYL_Z: '4.0', SYL_Y: '5.0', SYL_3Y: '6.0',
        }] });
      }
      return Response.json({ data: { diff: [{ f12: 'BK1', f14: 'Industry', f174: 100000000 }] } });
    };
    const gateway = new EastMoneyFundInsightsGateway(request as typeof fetch);
    await expect(gateway.getRanking()).resolves.toMatchObject([{
      code: '110022', nav: 2.8, dayReturnRatio: 0.032, weekReturnRatio: 0.04,
    }]);
    await expect(gateway.getFlows('industry')).resolves.toEqual([{
      code: 'BK1', name: 'Industry', netInflow: 100000000, category: 'industry',
    }]);
  });

  it('parses extended fund-page metadata and similar-fund performance', () => {
    const html = `<div class="fundDetail-tit"><div>Example Fund(001632)</div></div>
      <div class="infoOfFund">类型：指数型-股票 | 中高风险规模：39.85亿元（2026-03-31）基金经理：沙川
      成 立 日：2015-07-29 管 理 人：天弘基金 基金评级：<span class="jjpj2"></span>
      跟踪标的：中证食品饮料指数 | 年化跟踪误差：1.25%</div>
      <div class="rankInSimilarWrap"><div class="buyFundItem_fundMsg">
        <a class="shortName" href="http://fund.eastmoney.com/008326.html" title="Peer Fund">Peer</a>
        <span class="buyFundItem_date">近1年</span><span class="buyFundItem_rate">+21.60%</span>
      </div></div>`;
    expect(parseEastMoneyFundDetailPage(html, '001632')).toMatchObject({
      code: '001632', name: 'Example Fund', fundType: '指数型-股票', riskLevel: '中高风险',
      sizeCny: 3_985_000_000, sizeDate: '2026-03-31', manager: '沙川',
      establishedDate: '2015-07-29', managementCompany: '天弘基金', ratingStars: 2,
      trackingTarget: '中证食品饮料指数', annualTrackingErrorRatio: 0.0125,
      similarFunds: [{ code: '008326', name: 'Peer Fund', period: '近1年', returnRatio: 0.216 }],
    });
  });

  it('normalizes diagnosis returns, probabilities, scores, and institution ratings', () => {
    expect(parseEastMoneyFundDiagnosis({ Datas: {
      FCODE: '001632', SHORTNAME: 'Example Fund', FTYPE: '指数型-股票', RISKLEVEL: '4',
      ENDNAV: '3985416161.13', JJJL: '沙川', ESTABDATE: '2015-07-29',
      SYL_Z: '6.09', SYL_Y: '0.96', SYL_3Y: '-9.64', SYL_6Y: '-14.52',
      SYL_1N: '-15.68', SYL_3N: '-30.54', SYL_JN: '-14.45', SYL_LN: '89.70',
      PROFIT_Z: '40.85', PROFIT_Y: '36.6', PROFIT_3Y: '32.49', PROFIT_6Y: '29.73', PROFIT_1N: '25.67',
      DIAGONSEACH: { PROWIN: 79.68, FGOLD: '7.975' },
    } })).toMatchObject({
      riskLevel: 'Medium-high risk', sizeCny: 3985416161.13,
      returns: { week: 0.0609, month: 0.0096, year: -0.1568, sinceInception: 0.897 },
      profitProbability: { week: 0.4085, year: 0.2567 },
      overallScore: 79.68, fundScore: 7.975,
    });
    expect(parseEastMoneyFundInstitutionRatings({ Data: [
      { RDATE: '2026-03-31', ZSPJ: '4', JAPJ: null, SZPJ3: '3' },
      { RDATE: '2025-12-31', ZSPJ: null, JAPJ: null, SZPJ3: null },
    ] })).toEqual([{
      date: '2026-03-31', merchantSecurities: 4, jianFundEvaluation: undefined,
      shanghaiSecurities: 3,
    }]);
  });

  it('keeps fund details available when optional sources fail', async () => {
    const request = async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'https://fund.eastmoney.com/001632.html') {
        return new Response('<div class="fundDetail-tit"><div>Example Fund(001632)</div></div><div class="infoOfFund">类型：指数型-股票 | 中高风险规模：1亿元（2026-03-31）基金经理：Manager 成 立 日：2020-01-01 管 理 人：Company 基金评级：</div>');
      }
      throw new Error('optional source offline');
    };
    await expect(new EastMoneyFundInsightsGateway(request as typeof fetch).getDetail('001632'))
      .resolves.toMatchObject({ code: '001632', name: 'Example Fund', sizeCny: 100_000_000 });
  });
});

describe('EastMoney market sentiment normalization', () => {
  it('normalizes breadth statistics and distribution buckets', () => {
    expect(parseMarketBreadth([{
      time: '2026-07-17 11:16:29', up: 1043, down: 4065, r0: 457,
      t: 25, tn: 19, b: 46, rp10: 48, rp5: 474, rp01: 496,
      rn01: 629, rn1: 2595, rn5: 795,
    }])).toMatchObject({
      rising: 1043, falling: 4065, unchanged: 457, limitUp: 25,
      naturalLimitUp: 19, limitDown: 46,
      distribution: { aboveFive: 48, upOneToFive: 474, downOneToFive: 2595, belowFive: 795 },
    });
  });

  it('normalizes hot themes and percentage points', () => {
    expect(parseHotMarketThemes([{ Data: [{
      CategoryCode: 'theme-1', CategoryName: 'Theme', CZDF: '3.5',
      SecurityCode: '600000', SecurityName: 'Leader', SZDF: '9.9',
    }] }])).toEqual([{
      code: 'theme-1', name: 'Theme', changeRatio: 0.035,
      leadingStockCode: '600000', leadingStockName: 'Leader', leadingStockChangeRatio: 0.099,
    }]);
  });

  it('filters future placeholders and all-zero Stock Connect rows', () => {
    expect(parseStockConnectFlow({ data: { s2n: [
      '9:30,10000,0,0,-20000,0,0,-10000,0,0',
      '9:31,0.00,0,0,0.00,0,0,0.00,0,0',
      '9:32,-,-,-,-,-,-,-,-,-',
    ] } })).toEqual([{
      time: '9:30', shanghaiNetInflowYi: 1, shenzhenNetInflowYi: -2, northboundNetInflowYi: -1,
    }]);
  });
});

describe('XueqiuGateway', () => {
  it('does not issue requests without an explicit Cookie', async () => {
    const request = vi.fn();
    const gateway = new XueqiuGateway('', request as typeof fetch);

    await expect(gateway.getUsers(['123'])).resolves.toEqual([]);
    await expect(gateway.getTimeline('123')).resolves.toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('maps user profiles and supplies the Cookie only in host requests', async () => {
    let requestInit: RequestInit | undefined;
    const request = async (_input: string | URL | Request, init?: RequestInit) => {
      requestInit = init;
      return Response.json({
        user: { id: 123, screen_name: 'Researcher', description: 'Market notes' },
      });
    };
    const gateway = new XueqiuGateway('xq_a_token=secret', request as typeof fetch);

    await expect(gateway.getUsers(['123'])).resolves.toEqual([{
      id: '123', name: 'Researcher', description: 'Market notes', source: 'xueqiu',
    }]);
    expect(requestInit).toMatchObject({
      headers: expect.objectContaining({ Cookie: 'xq_a_token=secret' }),
    });
  });

  it('converts timeline HTML to static text and constructs fixed Xueqiu links', async () => {
    const request = async () => Response.json({ statuses: [{
      id: 456,
      text: '<p>Hello <strong>market</strong><script>alert(1)</script></p>',
      created_at: 1000,
      user: { screen_name: 'Researcher' },
    }] });
    const gateway = new XueqiuGateway('cookie', request as typeof fetch);

    await expect(gateway.getTimeline('123')).resolves.toEqual([{
      id: '456', userId: '123', userName: 'Researcher', text: 'Hello market',
      createdAt: 1000, url: 'https://xueqiu.com/123/456', source: 'xueqiu',
    }]);
  });
});
