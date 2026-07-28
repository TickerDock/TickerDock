import { funds } from 'fund-api';
import { stocks } from 'stock-api';
import { StockSDK } from 'stock-sdk';
import { parse } from 'node-html-parser';
import { createHash } from 'node:crypto';
import {
  CryptoGateway,
  CryptoQuote,
  FundGateway,
  FundEstimate,
  FundEstimateGateway,
  FlashNewsGateway,
  FlashNewsItem,
  FundNav,
  FundQuote,
  FundFlowItem,
  FundExtendedDetail,
  FundHolding,
  FundInstitutionRating,
  FundInsightsGateway,
  FundRankItem,
  ForexGateway,
  ForexQuote,
  Kline,
  HotMarketTheme,
  MarketBreadthSummary,
  MarketSentimentGateway,
  MarketSentimentSnapshot,
  marketFromLegacyCode,
  SearchResult,
  SocialFeedGateway,
  SocialPost,
  SocialUser,
  StockGateway,
  StockIwenCaiGateway,
  StockIwenCaiInsights,
  StockInstitutionReport,
  MarketFundFlowPoint,
  SectorFundFlowRankItem,
  StockFundFlowRankItem,
  StockQuote,
  StockResearchGateway,
  StockResearchItem,
  toStockApiCode,
} from '@tickerdock/domain';

type StockApiClient = typeof stocks.auto;
type FundApiClient = typeof funds.auto;

interface StockSdkFundClient {
  fund: {
    estimate: (code: string) => Promise<{
      code: string;
      navDate: string | null;
      estimatedNav: number | null;
      estimatedChangePercent: number | null;
      estimateTime: string | null;
    }>;
  };
}

interface StockSdkMarketClient {
  board: {
    concept: {
      list: () => Promise<Array<{
        code: string;
        name: string;
        changePercent: number | null;
        leadingStock: string | null;
        leadingStockChangePercent: number | null;
      }>>;
    };
  };
  fundFlow: {
    market: () => Promise<SdkMarketFundFlowRow[]>;
    rank: (options?: SdkFundFlowRankOptions) => Promise<SdkStockFundFlowRankRow[]>;
    sectorRank: (options?: SdkFundFlowRankOptions) => Promise<SdkSectorFundFlowRankRow[]>;
  };
}

type SdkFundFlowRankOptions = {
  indicator?: 'today' | '3day' | '5day' | '10day';
  sectorType?: 'industry' | 'concept' | 'region';
};

type SdkMarketFundFlowRow = {
  date: string;
  mainNetInflow: number | null;
  superLargeNetInflow: number | null;
  largeNetInflow: number | null;
  mediumNetInflow: number | null;
  smallNetInflow: number | null;
};

type SdkStockFundFlowRankRow = {
  code: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
};

type SdkSectorFundFlowRankRow = {
  code: string;
  name: string;
  changePercent: number | null;
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  topStockCode?: string;
  topStockName?: string;
};

const defaultStockSdk = createStockSdk();
const FUND_ESTIMATE_CONCURRENCY = 4;

export class StockApiGateway implements StockGateway {
  constructor(private readonly client: StockApiClient = stocks.auto) {}

  async getQuotes(codes: readonly string[]): Promise<StockQuote[]> {
    const supported = codes.flatMap((canonicalCode) => {
      try {
        return [{ canonicalCode, apiCode: toStockApiCode(canonicalCode) }];
      } catch {
        return [];
      }
    });
    const response = await this.client.getStocks(supported.map(({ apiCode }) => apiCode));
    const byCode = new Map(response.map((quote) => [quote.code.toUpperCase(), quote]));
    const supportedByCode = new Map(supported.map((item) => [item.canonicalCode, item]));

    return codes.flatMap((canonicalCode) => {
      const supportedItem = supportedByCode.get(canonicalCode);
      if (!supportedItem) return [];
      const { apiCode } = supportedItem;
      const quote = byCode.get(apiCode.toUpperCase());
      if (!quote) {
        return [unavailableStock(canonicalCode)];
      }
      return [{
        code: canonicalCode,
        name: quote.name || canonicalCode,
        market: marketFromLegacyCode(canonicalCode),
        price: quote.now,
        previousClose: quote.yesterday,
        high: quote.high,
        low: quote.low,
        change: quote.now - quote.yesterday,
        changeRatio: quote.percent,
        source: quote.source ?? 'stock-api',
        status: quote.name || quote.now ? 'live' : 'unavailable',
      }];
    });
  }

  async search(keyword: string): Promise<SearchResult[]> {
    const response = await this.client.searchStocks(keyword);
    return response.map((quote) => ({ code: quote.code, name: quote.name }));
  }

  async getKlines(
    code: string,
    options?: { period?: 'day' | 'week' | 'month'; count?: number; adjust?: 'none' | 'qfq' | 'hfq' }
  ): Promise<Kline[]> {
    const apiCode = toStockApiCode(code);
    const indexCode = ({ USDJI: 'US.DJI', USIXIC: 'US.IXIC', USINX: 'US.INX' } as const)[apiCode as 'USDJI' | 'USIXIC' | 'USINX'];
    return this.client.getKlines(indexCode ?? apiCode, indexCode ? { ...options, adjust: 'none' } : options);
  }
}

export class CompositeStockGateway implements StockGateway {
  constructor(
    private readonly stocksGateway: StockGateway = new StockApiGateway(),
    private readonly futuresGateway: StockGateway = new SinaFuturesGateway()
  ) {}

  async getQuotes(codes: readonly string[]): Promise<StockQuote[]> {
    const stockCodes = codes.filter((code) => !isFutureCode(code));
    const futureCodes = codes.filter(isFutureCode);
    const [stockQuotes, futureQuotes] = await Promise.all([
      this.stocksGateway.getQuotes(stockCodes),
      this.futuresGateway.getQuotes(futureCodes),
    ]);
    const byCode = new Map([...stockQuotes, ...futureQuotes].map((quote) => [quote.code, quote]));
    return codes.flatMap((code) => {
      const quote = byCode.get(code);
      return quote ? [quote] : [];
    });
  }

  search(keyword: string): Promise<SearchResult[]> {
    return this.stocksGateway.search(keyword);
  }

  getKlines(
    code: string,
    options?: { period?: 'day' | 'week' | 'month'; count?: number; adjust?: 'none' | 'qfq' | 'hfq' }
  ): Promise<Kline[]> {
    return isFutureCode(code) ? Promise.resolve([]) : this.stocksGateway.getKlines(code, options);
  }
}

export class SinaFuturesGateway implements StockGateway {
  constructor(private readonly request: typeof fetch = fetch) {}

  async getQuotes(codes: readonly string[]): Promise<StockQuote[]> {
    if (codes.length === 0) return [];
    const apiCodes = codes.map((code) => code.startsWith('HF') ? `hf_${code.slice(2)}` : code);
    const response = await this.request(`https://hq.sinajs.cn/list=${apiCodes.join(',')}`, {
      headers: { Referer: 'https://finance.sina.com.cn/' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return codes.map(unavailableFuture);
    const bytes = await response.arrayBuffer();
    const body = new TextDecoder('gb18030').decode(bytes);
    const parsed = new Map<string, StockQuote>();
    for (const matched of body.matchAll(/var hq_str_([^=]+)="([^"]*)"/g)) {
      const code = matched[1]?.replace(/^hf_/i, 'HF');
      const payload = matched[2];
      if (!code || !payload) continue;
      const quote = parseFutureQuote(code, payload.split(','));
      if (quote) parsed.set(code, quote);
    }
    return codes.map((code) => parsed.get(code) ?? unavailableFuture(code));
  }

  search(): Promise<SearchResult[]> { return Promise.resolve([]); }
  getKlines(): Promise<Kline[]> { return Promise.resolve([]); }
}

export class FundApiGateway implements FundGateway {
  constructor(private readonly client: FundApiClient = funds.auto) {}

  async getQuotes(codes: readonly string[]): Promise<FundQuote[]> {
    const response = await this.client.getFunds([...codes]);
    const byCode = new Map(response.map((fund) => [fund.code, fund]));
    return codes.map((code) => {
      const fund = byCode.get(code);
      if (!fund) return unavailableFund(code);
      return {
        code,
        name: fund.name || code,
        nav: fund.nav,
        accumulatedNav: fund.accNav,
        navDate: fund.navDate,
        navChangeRatio: fund.change / 100,
        source: fund.source,
        status: fund.name || fund.nav ? 'live' : 'unavailable',
      };
    });
  }

  async search(keyword: string): Promise<SearchResult[]> {
    const response = await this.client.searchFunds(keyword);
    return response.map((fund) => ({ code: fund.code, name: fund.name }));
  }

  async getNavHistory(code: string): Promise<FundNav[]> {
    const response = await this.client.getNavHistory(code);
    return response.map((item) => ({
      date: item.date,
      nav: item.nav,
      accumulatedNav: item.accNav,
      source: item.source,
    }));
  }
}

export class StockSdkFundEstimateGateway implements FundEstimateGateway {
  private readonly sdk: StockSdkFundClient;

  constructor(request: typeof fetch = fetch, sdk?: StockSdkFundClient) {
    this.sdk = sdk ?? (request === fetch ? defaultStockSdk : createStockSdk(request));
  }

  async getEstimates(codes: readonly string[]): Promise<FundEstimate[]> {
    const results: PromiseSettledResult<FundEstimate | undefined>[] = [];
    for (let index = 0; index < codes.length; index += FUND_ESTIMATE_CONCURRENCY) {
      results.push(...await Promise.allSettled(
        codes.slice(index, index + FUND_ESTIMATE_CONCURRENCY).map((code) => this.getEstimate(code))
      ));
    }
    return results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
  }

  private async getEstimate(code: string): Promise<FundEstimate | undefined> {
    const value = await this.sdk.fund.estimate(code);
    if (value.estimatedNav === null || value.estimatedChangePercent === null) return undefined;
    return {
      code: value.code || code,
      estimatedNav: value.estimatedNav,
      estimatedChangeRatio: value.estimatedChangePercent / 100,
      estimateTime: value.estimateTime || '',
      confirmedNavDate: value.navDate || '',
      source: 'stock-sdk',
    };
  }
}

export class BinanceGateway implements CryptoGateway {
  private readonly baseUrl = 'https://data-api.binance.vision/api/v3';
  private pairCatalog?: { expiresAt: number; symbols: BinanceSymbolInfo[] };
  private pairCatalogRequest?: Promise<BinanceSymbolInfo[]>;

  constructor(private readonly request: typeof fetch = fetch) {}

  async getQuotes(symbols: readonly string[]): Promise<CryptoQuote[]> {
    if (symbols.length === 0) return [];
    const normalized = symbols.map(normalizePair);
    const response = await this.request(
      `${this.baseUrl}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(normalized.map(({ api }) => api)))}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return normalized.map(({ display }) => unavailableCrypto(display));
    const payload = await response.json() as Array<Record<string, string>>;
    const bySymbol = new Map(payload.map((item) => [item.symbol, item]));
    return normalized.map(({ api, display, base, quote }) => {
      const item = bySymbol.get(api);
      if (!item) return unavailableCrypto(display);
      return {
        symbol: display,
        baseAsset: base,
        quoteAsset: quote,
        price: number(item.lastPrice),
        open: number(item.openPrice),
        previousClose: number(item.prevClosePrice),
        high: number(item.highPrice),
        low: number(item.lowPrice),
        change: number(item.priceChange),
        changeRatio: number(item.priceChangePercent) / 100,
        volume: number(item.volume),
        quoteVolume: number(item.quoteVolume),
        source: 'binance',
        status: number(item.lastPrice) > 0 ? 'live' : 'unavailable',
      };
    });
  }

  async searchPairs(keyword: string): Promise<SearchResult[]> {
    const symbols = await this.getPairCatalog();
    const query = keyword.trim().toUpperCase();
    return symbols
      .filter((item) => item.status === 'TRADING' && `${item.baseAsset}_${item.quoteAsset}`.includes(query))
      .slice(0, 100)
      .map((item) => ({ code: `${item.baseAsset}_${item.quoteAsset}`, name: `${item.baseAsset} / ${item.quoteAsset}` }));
  }

  private async getPairCatalog(): Promise<BinanceSymbolInfo[]> {
    if (this.pairCatalog && this.pairCatalog.expiresAt > Date.now()) return this.pairCatalog.symbols;
    if (this.pairCatalogRequest) return this.pairCatalogRequest;
    this.pairCatalogRequest = (async () => {
      const response = await this.request(`${this.baseUrl}/exchangeInfo`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return [];
      const payload = await response.json() as { symbols?: BinanceSymbolInfo[] };
      const symbols = payload.symbols ?? [];
      this.pairCatalog = { expiresAt: Date.now() + 5 * 60_000, symbols };
      return symbols;
    })();
    try {
      return await this.pairCatalogRequest;
    } finally {
      this.pairCatalogRequest = undefined;
    }
  }

  async getKlines(
    symbol: string,
    options: { interval?: '1h' | '4h' | '1d' | '1w'; limit?: number } = {}
  ): Promise<Kline[]> {
    const { api } = normalizePair(symbol);
    const interval = options.interval ?? '1d';
    const limit = Math.min(Math.max(Math.trunc(options.limit ?? 120), 1), 500);
    const response = await this.request(
      `${this.baseUrl}/klines?symbol=${encodeURIComponent(api)}&interval=${interval}&limit=${limit}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];
    const payload = await response.json() as unknown[][];
    return payload.flatMap((row) => {
      const timestamp = Number(row[0]);
      const open = Number(row[1]);
      const high = Number(row[2]);
      const low = Number(row[3]);
      const close = Number(row[4]);
      if (!Number.isFinite(timestamp) || open <= 0 || high <= 0 || low <= 0 || close <= 0) return [];
      return [{
        date: new Date(timestamp).toISOString(),
        open,
        high,
        low,
        close,
        volume: Number(row[5]),
        source: 'binance',
      } satisfies Kline];
    });
  }
}

interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export class BocForexGateway implements ForexGateway {
  constructor(private readonly request: typeof fetch = fetch) {}

  async getQuotes(): Promise<ForexQuote[]> {
    const response = await this.request('https://www.boc.cn/sourcedb/whpj/index.html', {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const bytes = await response.arrayBuffer();
    return parseBocForexHtml(new TextDecoder('utf-8').decode(bytes));
  }
}

export class Jin10FlashNewsGateway implements FlashNewsGateway {
  constructor(private readonly request: typeof fetch = fetch) {}

  async getLatest(limit = 40): Promise<FlashNewsItem[]> {
    const response = await this.request('https://flash-api.jin10.com/get_flash_list?channel=-8200&vip=1', {
      headers: {
        'x-app-id': 'SO1EJGmNgCtmpcPF',
        'x-version': '1.0.0',
        Referer: 'https://www.jin10.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const payload = await response.json() as { status?: number; data?: Jin10RawItem[] };
    if (payload.status !== 200) return [];
    return (payload.data ?? []).slice(0, limit).flatMap((item) => {
      const normalized = normalizeJin10Item(item);
      return normalized ? [normalized] : [];
    });
  }
}

export class XuanGuBaoFlashNewsGateway implements FlashNewsGateway {
  constructor(private readonly request: typeof fetch = fetch) {}

  async getLatest(limit = 40): Promise<FlashNewsItem[]> {
    const params = new URLSearchParams({
      limit: String(Math.min(Math.max(Math.trunc(limit), 1), 100)),
      subj_ids: '9,10,723,35,469',
      platform: 'pcweb',
    });
    const response = await this.request(
      `https://baoer-api-prod.xuangubao.cn/api/v6/message/newsflash?${params}`,
      {
        headers: { Referer: 'https://xuangubao.cn/', 'User-Agent': 'Mozilla/5.0 Chrome/124 Safari/537.36' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) return [];
    const payload = await response.json() as {
      code?: number;
      data?: { messages?: Array<Record<string, unknown>> };
    };
    if (payload.code !== 20000) return [];
    return (payload.data?.messages ?? []).flatMap((message) => {
      const id = message.id === undefined ? '' : String(message.id);
      const title = typeof message.title === 'string' ? parse(message.title).textContent.trim() : '';
      const summary = typeof message.summary === 'string' ? parse(message.summary).textContent.trim() : '';
      const createdAt = Number(message.created_at);
      if (!id || !title || !Number.isFinite(createdAt)) return [];
      return [{
        id,
        title,
        summary,
        time: new Date(createdAt * 1000).toISOString(),
        important: Number(message.impact) !== 0,
        kind: 'news',
        source: 'xuangubao',
        url: `https://xuangubao.cn/article/${encodeURIComponent(id)}`,
      } satisfies FlashNewsItem];
    });
  }
}

export class CompositeFlashNewsGateway implements FlashNewsGateway {
  constructor(private readonly gateways: readonly FlashNewsGateway[]) {}

  async getLatest(limit = 40): Promise<FlashNewsItem[]> {
    const results = await Promise.allSettled(this.gateways.map((gateway) => gateway.getLatest(limit)));
    const byId = new Map<string, FlashNewsItem>();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const item of result.value) byId.set(`${item.source}:${item.id}`, item);
    }
    return [...byId.values()]
      .sort((a, b) => newsTimestamp(b.time) - newsTimestamp(a.time))
      .slice(0, limit);
  }
}

export class JiuyangongsheResearchGateway implements StockResearchGateway {
  constructor(
    private readonly request: typeof fetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  async search(keyword: string, limit = 10): Promise<StockResearchItem[]> {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) return [];
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
    const timestamp = String(this.now());
    const token = createHash('md5').update(`Uu0KfOB8iUP69d3c:${timestamp}`).digest('hex');
    const response = await this.request(
      'https://app.jiuyangongshe.com/jystock-app/api/v2/article/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'Mozilla/5.0 Chrome/124 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://www.jiuyangongshe.com',
          Referer: 'https://www.jiuyangongshe.com/',
          platform: '3',
          timestamp,
          token,
        },
        body: JSON.stringify({
          back_garden: 0,
          keyword: normalizedKeyword,
          order: 1,
          limit: boundedLimit,
          start: 0,
          type: '1',
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) throw new Error(`Jiuyangongshe research request failed (${response.status})`);
    const payload = await response.json() as {
      errCode?: string;
      msg?: string;
      data?: { result?: Array<Record<string, unknown>> };
    };
    if (payload.errCode !== '0') throw new Error(payload.msg || 'Jiuyangongshe research request was rejected');
    return (payload.data?.result ?? []).slice(0, boundedLimit).flatMap((item) => {
      const id = string(item.article_id).trim();
      const title = parse(string(item.title)).textContent.trim();
      const summary = parse(string(item.content)).textContent.trim();
      const time = string(item.create_time).trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || !title) return [];
      return [{
        id,
        title,
        summary,
        time,
        source: 'jiuyangongshe',
        url: `https://www.jiuyangongshe.com/a/${encodeURIComponent(id)}`,
      } satisfies StockResearchItem];
    });
  }
}

export class IwenCaiStockInsightsGateway implements StockIwenCaiGateway {
  constructor(private readonly request: typeof fetch = fetch) {}

  async getInsights(code: string, name: string, hexinToken: string): Promise<StockIwenCaiInsights> {
    const stockCode = /^(?:sh|sz|bj)(\d{6})$/i.exec(code)?.[1];
    const stockName = name.trim();
    if (!stockCode || !stockName) throw new Error(`iWencai supports named A-share stocks only: ${code}`);
    if (!isHexinToken(hexinToken)) throw new Error('Invalid iWencai browser token.');
    const hotResult = await settled(this.loadData(`${stockName}市场热度；撑压位`, hexinToken));
    const [diagnosisResult, conceptResult, reportsResult] = await Promise.allSettled([
      this.blockDetail(stockCode, 8093, 137, hexinToken),
      this.blockDetail(stockCode, 10685, 3963, hexinToken),
      this.loadData(`${stockName}机构评级`, hexinToken),
    ]);
    if ([hotResult, diagnosisResult, conceptResult, reportsResult].every(({ status }) => status === 'rejected')) {
      throw firstRejectedReason([hotResult, diagnosisResult, conceptResult, reportsResult]);
    }
    return {
      ...(diagnosisResult.status === 'fulfilled' ? { diagnosis: parseIwenCaiDiagnosis(diagnosisResult.value) } : {}),
      concepts: conceptResult.status === 'fulfilled' ? parseIwenCaiConcepts(conceptResult.value) : [],
      ...(hotResult.status === 'fulfilled' ? parseIwenCaiHotData(hotResult.value) : {}),
      institutionReports: reportsResult.status === 'fulfilled' ? parseIwenCaiReports(reportsResult.value) : [],
    };
  }

  private loadData(query: string, token: string): Promise<unknown> {
    const url = new URL('https://www.iwencai.com/stockpick/load-data');
    url.search = new URLSearchParams({ typed: '0', ts: '1', f: '1', querytype: 'stock', w: query }).toString();
    return this.getJson(url, token);
  }

  private blockDetail(code: string, pid: number, tid: number, token: string): Promise<unknown> {
    const info = { view: { nolazy: 1, parseArr: { _v: 'new', dateRange: [], staying: [], queryCompare: [], comparesOfIndex: [] }, asyncParams: { tid } } };
    const url = new URL('https://www.iwencai.com/diag/block-detail');
    url.search = new URLSearchParams({ pid: String(pid), codes: code, codeType: 'stock', info: JSON.stringify(info) }).toString();
    return this.getJson(url, token);
  }

  private async getJson(url: URL, token: string): Promise<unknown> {
    const response = await this.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'X-Requested-With': 'XMLHttpRequest',
        'hexin-v': token,
        Referer: 'https://www.iwencai.com/',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`iWencai request failed (${response.status})`);
    return response.json();
  }
}

export function parseIwenCaiHotData(value: unknown): Partial<StockIwenCaiInsights> {
  const table = iwenCaiTable(value);
  return {
    heat: tableValue(table, 0, '个股热度'),
    pressure: tableValue(table, 0, '止盈止损(压力位)'),
    support: tableValue(table, 0, '止盈止损(支撑位)'),
    takeProfit: tableValue(table, 0, '止盈止损(止盈位)'),
    stopLoss: tableValue(table, 0, '止盈止损(止损位)'),
  };
}

export function parseIwenCaiDiagnosis(value: unknown) {
  const result = record(record(record(value)?.data)?.data)?.result;
  const diagnosis = record(result);
  if (!diagnosis) return undefined;
  const title = normalizedText(diagnosis._title);
  const short = normalizedText(diagnosis._short);
  const mid = normalizedText(diagnosis._mid);
  const long = normalizedText(diagnosis._long);
  const content = normalizedText(parse(string(diagnosis._content)).textContent);
  if (!title && !short && !mid && !long && !content) return undefined;
  const score = optionalNumber(diagnosis._score);
  return { title, ...(score !== undefined ? { score } : {}), short, mid, long, content };
}

export function parseIwenCaiConcepts(value: unknown) {
  const result = record(record(record(value)?.data)?.data)?.result;
  if (!Array.isArray(result)) return [];
  return result.flatMap((item) => {
    const concept = record(item);
    const title = normalizedText(concept?.title);
    if (!title) return [];
    const content = normalizedText(concept?.content);
    return [{ title, ...(content ? { content } : {}) }];
  });
}

export function parseIwenCaiReports(value: unknown): StockInstitutionReport[] {
  const table = iwenCaiTable(value);
  if (!table) return [];
  return table.rows.slice(0, 20).map((_, index) => ({
    reportDate: tableValue(table, index, '最新报告日期') ?? '--',
    rating: tableValue(table, index, '最新研究机构原始评级') ?? '--',
    previousRating: tableValue(table, index, '上次研究机构原始评级') ?? '--',
    direction: tableValue(table, index, '评级调整方向') ?? '--',
    targetPrice: tableValue(table, index, '研报目标价') ?? '--',
    researcher: tableValue(table, index, '研究员姓名') ?? '--',
    iwencaiRating: tableValue(table, index, '最新同花顺评级') ?? '--',
  }));
}

export class EastMoneyFundInsightsGateway implements FundInsightsGateway {
  constructor(private readonly request: typeof fetch = fetch) {}

  async getDetail(code: string): Promise<FundExtendedDetail> {
    if (!/^\d{6}$/.test(code)) throw new Error(`Unsupported fund code: ${code}`);
    const [pageResult, diagnosisResult, ratingsResult, holdingsResult] = await Promise.allSettled([
      this.getDetailPage(code),
      this.getDiagnosis(code),
      this.getInstitutionRatings(code),
      this.getHoldings(code),
    ]);
    const page = pageResult.status === 'fulfilled' ? pageResult.value : {};
    const definedPage = Object.fromEntries(
      Object.entries(page).filter(([, value]) => value !== undefined)
    ) as Partial<FundExtendedDetail>;
    const diagnosis = diagnosisResult.status === 'fulfilled' ? diagnosisResult.value : {};
    const institutionRatings = ratingsResult.status === 'fulfilled' ? ratingsResult.value : [];
    const holdings = holdingsResult.status === 'fulfilled' ? holdingsResult.value : [];
    if (pageResult.status === 'rejected' && diagnosisResult.status === 'rejected'
      && ratingsResult.status === 'rejected' && holdingsResult.status === 'rejected') {
      throw new Error('All EastMoney fund-detail sources are unavailable.');
    }
    return {
      ...diagnosis,
      ...definedPage,
      code,
      name: definedPage.name || diagnosis.name || code,
      returns: diagnosis.returns ?? {},
      profitProbability: diagnosis.profitProbability ?? {},
      institutionRatings,
      similarFunds: definedPage.similarFunds ?? [],
      holdings,
    };
  }

  async getHoldings(code: string): Promise<FundHolding[]> {
    const response = await this.request(
      `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${encodeURIComponent(code)}&topline=10&year=&month=&rt=${Date.now()}`,
      { headers: { Referer: 'https://fundf10.eastmoney.com/' }, signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) return [];
    return parseEastMoneyFundHoldings(await response.text());
  }

  async getRanking(limit = 40): Promise<FundRankItem[]> {
    const params = new URLSearchParams({
      plat: 'Android', appType: 'ttjj', product: 'EFund', Version: '1', deviceid: 'tickerdock',
      pageIndex: '1', pageSize: String(limit), Sort: 'RZDF', orderType: 'desc', FundType: '0', BUY: 'true',
    });
    const response = await this.request(`https://fundmobapi.eastmoney.com/FundMNewApi/FundMNRank?${params}`, {
      headers: { Referer: 'https://fund.eastmoney.com/' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const payload = await response.json() as { Datas?: Array<Record<string, string>> };
    return (payload.Datas ?? []).map((item) => ({
      code: item.FCODE || '',
      name: item.SHORTNAME || '',
      nav: number(item.DWJZ),
      navDate: item.FSRQ || '',
      dayReturnRatio: ratioFromPercentPoints(item.RZDF) ?? 0,
      weekReturnRatio: ratioFromPercentPoints(item.SYL_Z),
      monthReturnRatio: ratioFromPercentPoints(item.SYL_Y),
      threeMonthReturnRatio: ratioFromPercentPoints(item.SYL_3Y),
      sixMonthReturnRatio: ratioFromPercentPoints(item.SYL_6Y),
      yearReturnRatio: ratioFromPercentPoints(item.SYL_1N),
      yearToDateReturnRatio: ratioFromPercentPoints(item.SYL_JN),
    }));
  }

  async getFlows(category: FundFlowItem['category'], limit = 20): Promise<FundFlowItem[]> {
    const type = category === 'region' ? 1 : category === 'industry' ? 2 : 3;
    const response = await this.request(
      `https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f174&code=m%3A90%2Bt%3A${type}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) return [];
    const payload = await response.json() as { data?: { diff?: Array<Record<string, string | number>> } };
    return (payload.data?.diff ?? [])
      .map((item) => ({
        code: String(item.f12 ?? ''),
        name: String(item.f14 ?? ''),
        netInflow: Number(item.f174 ?? 0),
        category,
      }))
      .sort((a, b) => b.netInflow - a.netInflow)
      .slice(0, limit);
  }

  private async getDetailPage(code: string): Promise<Partial<FundExtendedDetail>> {
    const response = await this.request(`https://fund.eastmoney.com/${encodeURIComponent(code)}.html`, {
      headers: { Referer: 'https://fund.eastmoney.com/' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`EastMoney fund page returned HTTP ${response.status}.`);
    return parseEastMoneyFundDetailPage(await decodeResponseText(response), code);
  }

  private async getDiagnosis(code: string): Promise<Partial<FundExtendedDetail>> {
    const params = new URLSearchParams({
      version: '10.0', deviceid: 'tickerdock', product: 'EFund', plat: 'Iphone', FCODE: code,
    });
    const response = await this.request(`https://fundmobapi.eastmoney.com/FundMNewApi/FundMNCSDiag?${params}`, {
      headers: { Referer: 'https://fund.eastmoney.com/' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`EastMoney fund diagnosis returned HTTP ${response.status}.`);
    return parseEastMoneyFundDiagnosis(await response.json());
  }

  private async getInstitutionRatings(code: string): Promise<FundInstitutionRating[]> {
    const params = new URLSearchParams({
      fundcode: code, pageIndex: '1', pageSize: '5', _: String(Date.now()),
    });
    const response = await this.request(`https://api.fund.eastmoney.com/F10/JJPJ/?${params}`, {
      headers: {
        Referer: 'https://fundf10.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`EastMoney institution ratings returned HTTP ${response.status}.`);
    return parseEastMoneyFundInstitutionRatings(await response.json());
  }
}

export class EastMoneyMarketSentimentGateway implements MarketSentimentGateway {
  private readonly sdk: StockSdkMarketClient;

  constructor(private readonly request: typeof fetch = fetch, sdk?: StockSdkMarketClient) {
    this.sdk = sdk ?? (request === fetch ? defaultStockSdk : createStockSdk(request));
  }

  async getSnapshot(): Promise<MarketSentimentSnapshot> {
    const results = await Promise.allSettled([
      this.getBreadth(),
      this.getHotThemes(),
      this.getMarketFundFlow(),
      this.getStockFundFlowRank(),
      this.getSectorFundFlowRank(),
    ]);
    return {
      breadth: results[0]?.status === 'fulfilled' ? results[0].value : undefined,
      hotThemes: results[1]?.status === 'fulfilled' ? results[1].value : [],
      marketFundFlow: results[2]?.status === 'fulfilled' ? results[2].value : [],
      stockFundFlowRank: results[3]?.status === 'fulfilled' ? results[3].value : [],
      sectorFundFlowRank: results[4]?.status === 'fulfilled' ? results[4].value : [],
    };
  }

  async getBreadth(): Promise<MarketBreadthSummary | undefined> {
    return parseMarketBreadth(await this.getJson('https://emdatah5.eastmoney.com/dc/NXFXB/GetUpDownData?type=0'));
  }

  async getMarketFundFlow(): Promise<MarketFundFlowPoint[]> {
    return normalizeMarketFundFlow(await this.sdk.fundFlow.market());
  }

  async getStockFundFlowRank(): Promise<StockFundFlowRankItem[]> {
    return normalizeStockFundFlowRank(await this.sdk.fundFlow.rank({ indicator: 'today' }));
  }

  async getSectorFundFlowRank(): Promise<SectorFundFlowRankItem[]> {
    return normalizeSectorFundFlowRank(await this.sdk.fundFlow.sectorRank({
      indicator: 'today', sectorType: 'industry',
    }));
  }

  async getHotThemes(): Promise<HotMarketTheme[]> {
    const supplementUrl = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f12,f14,f3,f128,f140,f136';
    const [sdkResult, supplementResult] = await Promise.allSettled([
      this.sdk.board.concept.list(),
      this.getJson(supplementUrl),
    ]);
    const supplement = supplementResult.status === 'fulfilled'
      ? parseHotMarketThemes(supplementResult.value)
      : [];
    if (sdkResult.status !== 'fulfilled') return supplement;

    const details = new Map(supplement.map((item) => [item.code, item]));
    return sdkResult.value.slice(0, 10).map((board) => {
      const detail = details.get(board.code);
      return {
        code: board.code,
        name: board.name,
        changeRatio: (board.changePercent ?? 0) / 100,
        leadingStockCode: detail?.leadingStockCode ?? '',
        leadingStockName: board.leadingStock ?? detail?.leadingStockName ?? '',
        leadingStockChangeRatio: (board.leadingStockChangePercent ?? 0) / 100,
      };
    });
  }

  private async getJson(url: string): Promise<unknown> {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('_', String(Date.now()));
    const response = await this.request(requestUrl, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://data.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`EastMoney market sentiment request failed: ${response.status}`);
    return response.json();
  }
}

function createStockSdk(request: typeof fetch = fetch): StockSDK {
  return new StockSDK({
    fetchImpl: limitSdkFundFlowRankPages(request),
    retry: { maxRetries: 1, baseDelay: 300 },
    providerPolicies: {
      tencent: { timeout: 8000 },
      eastmoney: { timeout: 10000, rateLimit: { requestsPerSecond: 5, maxBurst: 5 } },
      sina: { timeout: 8000 },
    },
  });
}

function limitSdkFundFlowRankPages(request: typeof fetch): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const response = await request(input, init);
    const requestUrl = new URL(input instanceof Request ? input.url : String(input));
    if (!response.ok || !requestUrl.pathname.endsWith('/api/qt/clist/get')
      || requestUrl.searchParams.get('fid') !== 'f62' || requestUrl.searchParams.get('pn') !== '1') return response;
    const payload = await response.clone().json() as { data?: { total?: number } };
    if (!payload.data || typeof payload.data.total !== 'number' || payload.data.total <= 100) return response;

    // fundFlow.rank has no limit option; cap pagination because the UI only consumes the leading ten rows.
    payload.data.total = 100;
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export function parseMarketBreadth(value: unknown): MarketBreadthSummary | undefined {
  const first = Array.isArray(value) ? record(value[0]) : undefined;
  if (!first) return undefined;
  const rising = integer(first.up);
  const falling = integer(first.down);
  if (rising === undefined || falling === undefined) return undefined;
  return {
    time: string(first.time),
    rising,
    falling,
    unchanged: integer(first.r0) ?? 0,
    limitUp: integer(first.t) ?? 0,
    naturalLimitUp: integer(first.tn) ?? 0,
    limitDown: integer(first.b) ?? 0,
    distribution: {
      limitUp: integer(first.t) ?? 0,
      aboveFive: integer(first.rp10) ?? 0,
      upOneToFive: integer(first.rp5) ?? 0,
      upZeroToOne: integer(first.rp01) ?? 0,
      flat: integer(first.r0) ?? 0,
      downZeroToOne: integer(first.rn01) ?? 0,
      downOneToFive: integer(first.rn1) ?? 0,
      belowFive: integer(first.rn5) ?? 0,
      limitDown: integer(first.b) ?? 0,
    },
  };
}

export function parseHotMarketThemes(value: unknown): HotMarketTheme[] {
  const root = record(value);
  const currentData = record(root?.data);
  const currentRows = Array.isArray(currentData?.diff) ? currentData.diff : [];
  if (currentRows.length > 0) {
    return currentRows.flatMap((raw) => {
      const item = record(raw);
      if (!item) return [];
      const name = string(item.f14);
      const code = string(item.f12);
      const leadingStockName = string(item.f128);
      if (!name || !code || !leadingStockName) return [];
      return [{
        code,
        name,
        changeRatio: number(item.f3) / 100,
        leadingStockCode: string(item.f140),
        leadingStockName,
        leadingStockChangeRatio: number(item.f136) / 100,
      }];
    }).slice(0, 10);
  }

  const first = Array.isArray(value) ? record(value[0]) : undefined;
  const data = first && Array.isArray(first.Data) ? first.Data : [];
  return data.flatMap((raw) => {
    const item = record(raw);
    if (!item) return [];
    const name = string(item.CategoryName);
    const code = string(item.CategoryCode);
    const leadingStockName = string(item.SecurityName);
    if (!name || !code || !leadingStockName) return [];
    return [{
      code,
      name,
      changeRatio: number(item.CZDF) / 100,
      leadingStockCode: string(item.SecurityCode),
      leadingStockName,
      leadingStockChangeRatio: number(item.SZDF) / 100,
    }];
  }).slice(0, 10);
}

export function normalizeMarketFundFlow(rows: SdkMarketFundFlowRow[]): MarketFundFlowPoint[] {
  return rows.flatMap((row) => {
    if (!row.date || row.mainNetInflow === null || row.superLargeNetInflow === null
      || row.largeNetInflow === null || row.mediumNetInflow === null || row.smallNetInflow === null) return [];
    return [{
      date: row.date,
      mainNetInflowYi: row.mainNetInflow / 100_000_000,
      superLargeNetInflowYi: row.superLargeNetInflow / 100_000_000,
      largeNetInflowYi: row.largeNetInflow / 100_000_000,
      mediumNetInflowYi: row.mediumNetInflow / 100_000_000,
      smallNetInflowYi: row.smallNetInflow / 100_000_000,
    }];
  }).slice(-30);
}

export function normalizeStockFundFlowRank(rows: SdkStockFundFlowRankRow[]): StockFundFlowRankItem[] {
  return rows.flatMap((row) => row.code && row.name && row.mainNetInflow !== null ? [{
    code: row.code,
    name: row.name,
    price: row.price ?? undefined,
    changeRatio: row.changePercent === null ? undefined : row.changePercent / 100,
    mainNetInflowYi: row.mainNetInflow / 100_000_000,
    mainNetInflowRatio: row.mainNetInflowPercent === null ? undefined : row.mainNetInflowPercent / 100,
  }] : []).slice(0, 10);
}

export function normalizeSectorFundFlowRank(rows: SdkSectorFundFlowRankRow[]): SectorFundFlowRankItem[] {
  return rows.flatMap((row) => {
    if (!row.code || !row.name || row.mainNetInflow === null) return [];
    const leader = normalizeSdkLeader(row.topStockCode, row.topStockName);
    return [{
      code: row.code,
      name: row.name,
      changeRatio: row.changePercent === null ? undefined : row.changePercent / 100,
      mainNetInflowYi: row.mainNetInflow / 100_000_000,
      mainNetInflowRatio: row.mainNetInflowPercent === null ? undefined : row.mainNetInflowPercent / 100,
      ...leader,
    }];
  }).slice(0, 10);
}

function normalizeSdkLeader(code?: string, name?: string): Pick<SectorFundFlowRankItem, 'topStockCode' | 'topStockName'> {
  const codePattern = /^(?:SH|SZ|BJ)?\d{6}$/i;
  if (name && codePattern.test(name) && code && !codePattern.test(code)) {
    return { topStockCode: name, topStockName: code };
  }
  return { topStockCode: code, topStockName: name };
}

export class XueqiuGateway implements SocialFeedGateway {
  constructor(
    private readonly cookie: string,
    private readonly request: typeof fetch = fetch
  ) {}

  async getUsers(userIds: readonly string[]): Promise<SocialUser[]> {
    if (!this.cookie) return [];
    const results = await Promise.allSettled(userIds.map(async (userId) => {
      const response = await this.get(`https://xueqiu.com/statuses/original/show.json?user_id=${encodeURIComponent(userId)}`);
      if (!response.ok) return undefined;
      const payload = await response.json() as { user?: { id?: string | number; screen_name?: string; description?: string } };
      const user = payload.user;
      if (!user?.id || !user.screen_name) return undefined;
      return {
        id: String(user.id),
        name: user.screen_name,
        description: user.description ?? '',
        source: 'xueqiu',
      } satisfies SocialUser;
    }));
    return results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
  }

  async getTimeline(userId: string): Promise<SocialPost[]> {
    if (!this.cookie) return [];
    const response = await this.get(`https://xueqiu.com/v4/statuses/user_timeline.json?page=1&user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) return [];
    const payload = await response.json() as { statuses?: Array<Record<string, unknown>> };
    return (payload.statuses ?? []).flatMap((status) => {
      const id = status.id === undefined ? '' : String(status.id);
      const rawText = typeof status.text === 'string'
        ? status.text
        : typeof status.description === 'string' ? status.description : '';
      const root = parse(rawText);
      root.querySelectorAll('script,style').forEach((element) => element.remove());
      const text = root.textContent.trim();
      if (!id || !text) return [];
      const user = status.user as Record<string, unknown> | undefined;
      return [{
        id,
        userId,
        userName: typeof user?.screen_name === 'string' ? user.screen_name : userId,
        text,
        createdAt: Number(status.created_at ?? Date.now()),
        url: `https://xueqiu.com/${encodeURIComponent(userId)}/${encodeURIComponent(id)}`,
        source: 'xueqiu',
      } satisfies SocialPost];
    });
  }

  private get(url: string): Promise<Response> {
    return this.request(url, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Cookie: this.cookie,
        Referer: 'https://xueqiu.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
  }
}

type Jin10RawItem = {
  id?: string;
  important?: number;
  time?: string;
  type?: number;
  data?: Record<string, unknown>;
};

function normalizeJin10Item(item: Jin10RawItem): FlashNewsItem | undefined {
  if (!item.id || !item.time || !item.data) return undefined;
  if (item.type === 0) {
    const content = typeof item.data.content === 'string' ? parse(item.data.content).textContent.trim() : '';
    if (!content) return undefined;
    return {
      id: item.id,
      title: content,
      summary: '',
      time: item.time,
      important: item.important === 1,
      kind: 'news',
      source: 'jin10',
      url: `https://flash.jin10.com/detail/${item.id}`,
    };
  }
  if (item.type === 1) {
    const country = String(item.data.country ?? '');
    const period = String(item.data.time_period ?? '');
    const name = String(item.data.name ?? 'Economic data');
    const actual = String(item.data.actual ?? '--');
    const unit = String(item.data.unit ?? '');
    return {
      id: item.id,
      title: `${country} ${period} ${name}: ${actual}${unit}`.trim(),
      summary: '',
      time: item.time,
      important: item.important === 1,
      kind: 'economic-data',
      source: 'jin10',
      url: `https://flash.jin10.com/detail/${item.id}`,
    };
  }
  return undefined;
}

function newsTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function parseEastMoneyFundHoldings(body: string): FundHolding[] {
  const start = body.indexOf('content:"');
  const end = body.lastIndexOf('",arryear:');
  if (start < 0 || end <= start) return [];
  const html = body.slice(start + 'content:"'.length, end).replace(/\\"/g, '"');
  const root = parse(html);
  const reportDate = root.querySelector('.px12')?.textContent.trim() ?? '';
  return root.querySelectorAll('table tbody tr').flatMap((row) => {
    const cells = row.querySelectorAll('td').map((cell) => cell.textContent.trim());
    const code = cells[1];
    const name = cells[2];
    if (!code || !name) return [];
    return [{
      code,
      name,
      navRatio: (optionalNumber(cells[6]?.replace('%', '')) ?? 0) / 100,
      sharesWan: optionalNumber(cells[7]?.replace(/,/g, '')) ?? 0,
      marketValueWan: optionalNumber(cells[8]?.replace(/,/g, '')) ?? 0,
      reportDate,
    }];
  });
}

export function parseEastMoneyFundDetailPage(html: string, code: string): Partial<FundExtendedDetail> {
  const root = parse(html);
  const heading = normalizedText(root.querySelector('.fundDetail-tit div')?.textContent);
  const info = normalizedText(root.querySelector('.infoOfFund')?.textContent);
  const sizeMatch = /规模：\s*([^（]+?)(?:（([^）]+)）)?基金经理：/.exec(info);
  const trackingMatch = /跟踪标的：\s*(.*?)\s*\|\s*年化跟踪误差：\s*([\d.-]+)%/.exec(info);
  const ratingClass = root.querySelector('[class^=jjpj]')?.getAttribute('class') ?? '';
  const name = heading.replace(new RegExp(`\\(${code}.*$`), '').trim();
  const similarFunds = root.querySelectorAll('.rankInSimilarWrap .buyFundItem_fundMsg').flatMap((item) => {
    const anchor = item.querySelector('a.shortName');
    const href = anchor?.getAttribute('href') ?? '';
    const matchedCode = /\/(\d{6})\.html/.exec(href)?.[1];
    const name = anchor?.getAttribute('title')?.trim() || normalizedText(anchor?.textContent);
    if (!matchedCode || !name) return [];
    const period = normalizedText(item.querySelector('.buyFundItem_date')?.textContent);
    const returnRatio = ratioFromText(item.querySelector('.buyFundItem_rate')?.textContent);
    return [{ code: matchedCode, name, period, returnRatio }];
  });
  const size = sizeMatch?.[1] ? parseChineseCnyAmount(sizeMatch[1]) : undefined;
  return {
    code,
    name: name || undefined,
    fundType: /类型：\s*(.*?)\s*\|/.exec(info)?.[1]?.trim(),
    riskLevel: /\|\s*(.*?)规模：/.exec(info)?.[1]?.trim(),
    sizeCny: size,
    sizeDate: sizeMatch?.[2]?.trim(),
    manager: /基金经理：\s*(.*?)成\s*立\s*日/.exec(info)?.[1]?.trim(),
    establishedDate: /成\s*立\s*日：\s*(\d{4}-\d{2}-\d{2})/.exec(info)?.[1],
    managementCompany: /管\s*理\s*人：\s*(.*?)基金评级/.exec(info)?.[1]?.trim(),
    ratingStars: boundedStars(/\bjjpj(\d)\b/.exec(ratingClass)?.[1]),
    trackingTarget: trackingMatch?.[1]?.trim(),
    annualTrackingErrorRatio: trackingMatch?.[2] ? Number(trackingMatch[2]) / 100 : undefined,
    similarFunds,
  };
}

export function parseEastMoneyFundDiagnosis(value: unknown): Partial<FundExtendedDetail> {
  const data = record(record(value)?.Datas);
  if (!data) return {};
  const diagnosis = record(data.DIAGONSEACH);
  return {
    code: string(data.FCODE),
    name: string(data.SHORTNAME),
    fundType: string(data.FTYPE) || undefined,
    riskLevel: fundRiskLevel(data.RISKLEVEL),
    sizeCny: optionalPositiveNumber(data.ENDNAV),
    manager: string(data.JJJL) || undefined,
    establishedDate: string(data.ESTABDATE) || undefined,
    returns: {
      week: ratioFromUnknownPercent(data.SYL_Z),
      month: ratioFromUnknownPercent(data.SYL_Y),
      threeMonth: ratioFromUnknownPercent(data.SYL_3Y),
      sixMonth: ratioFromUnknownPercent(data.SYL_6Y),
      year: ratioFromUnknownPercent(data.SYL_1N),
      threeYear: ratioFromUnknownPercent(data.SYL_3N),
      yearToDate: ratioFromUnknownPercent(data.SYL_JN),
      sinceInception: ratioFromUnknownPercent(data.SYL_LN),
    },
    profitProbability: {
      week: ratioFromUnknownPercent(data.PROFIT_Z),
      month: ratioFromUnknownPercent(data.PROFIT_Y),
      threeMonth: ratioFromUnknownPercent(data.PROFIT_3Y),
      sixMonth: ratioFromUnknownPercent(data.PROFIT_6Y),
      year: ratioFromUnknownPercent(data.PROFIT_1N),
    },
    overallScore: optionalNumber(diagnosis?.PROWIN),
    fundScore: optionalNumber(diagnosis?.FGOLD),
  };
}

export function parseEastMoneyFundInstitutionRatings(value: unknown): FundInstitutionRating[] {
  const data = record(value)?.Data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    const item = record(raw);
    if (!item) return [];
    const rating: FundInstitutionRating = {
      date: string(item.RDATE),
      merchantSecurities: boundedStars(item.ZSPJ),
      jianFundEvaluation: boundedStars(item.JAPJ),
      shanghaiSecurities: boundedStars(item.SZPJ3),
    };
    return rating.date && [rating.merchantSecurities, rating.jianFundEvaluation, rating.shanghaiSecurities]
      .some((score) => score !== undefined) ? [rating] : [];
  });
}

export function parseBocForexHtml(html: string): ForexQuote[] {
  const root = parse(html);
  const quotes: ForexQuote[] = [];
  const table = root.querySelectorAll('table')[1];
  for (const row of table?.querySelectorAll('tr') ?? []) {
    const cells = row.querySelectorAll('td').map((cell) => cell.textContent.trim());
    if (!cells[0]) continue;
    quotes.push({
      name: cells[0],
      spotBuyPrice: optionalNumber(cells[1]),
      cashBuyPrice: optionalNumber(cells[2]),
      spotSellPrice: optionalNumber(cells[3]),
      cashSellPrice: optionalNumber(cells[4]),
      conversionPrice: optionalNumber(cells[5]),
      publishDate: cells[6] || '',
      publishTime: cells[7] || '',
      source: 'bank-of-china',
    });
  }
  return quotes;
}

function unavailableStock(code: string): StockQuote {
  return {
    code,
    name: code,
    market: marketFromLegacyCode(code),
    price: 0,
    previousClose: 0,
    high: 0,
    low: 0,
    change: 0,
    changeRatio: 0,
    source: 'stock-api',
    status: 'unavailable',
  };
}

function parseFutureQuote(code: string, fields: string[]): StockQuote | undefined {
  if (code.startsWith('HF')) {
    const current = number(fields[0]);
    const bid = number(fields[2]);
    const ask = number(fields[3]);
    const price = current > ask || current < bid ? bid : current;
    return createFutureQuote(code, fields[13] || code, price, number(fields[7]), number(fields[8]), number(fields[4]), number(fields[5]), 'global-future');
  }

  const isIndex = /^HF(?:IC|IF|IH|IM|TF|TS|T\d|TL)/.test(code);
  if (isIndex) {
    return createFutureQuote(code, fields[49] || code, number(fields[3]), number(fields[13]), number(fields[0]), number(fields[1]), number(fields[2]), 'cn-future');
  }
  return createFutureQuote(code, fields[0] || code, number(fields[8]), number(fields[10]), number(fields[2]), number(fields[3]), number(fields[4]), 'cn-future');
}

function createFutureQuote(
  code: string,
  name: string,
  price: number,
  previousClose: number,
  open: number,
  high: number,
  low: number,
  market: 'cn-future' | 'global-future'
): StockQuote {
  const safePrice = price > 0 ? price : previousClose;
  const change = safePrice - previousClose;
  return {
    code,
    name: name.replace(/"$/, ''),
    market,
    price: safePrice,
    previousClose,
    open,
    high,
    low,
    change,
    changeRatio: previousClose > 0 ? change / previousClose : 0,
    source: 'sina-futures',
    status: safePrice > 0 ? 'live' : 'unavailable',
  };
}

function unavailableFuture(code: string): StockQuote {
  return {
    code,
    name: code,
    market: code.startsWith('HF') ? 'global-future' : 'cn-future',
    price: 0,
    previousClose: 0,
    high: 0,
    low: 0,
    change: 0,
    changeRatio: 0,
    source: 'sina-futures',
    status: 'unavailable',
  };
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function isFutureCode(code: string): boolean {
  return /^HF[A-Z0-9]+$/i.test(code);
}

function normalizePair(symbol: string): { api: string; display: string; base: string; quote: string } {
  const [base = '', quote = ''] = symbol.trim().toUpperCase().split('_');
  return { api: `${base}${quote}`, display: `${base}_${quote}`, base, quote };
}

function unavailableCrypto(symbol: string): CryptoQuote {
  const pair = normalizePair(symbol);
  return {
    symbol: pair.display,
    baseAsset: pair.base,
    quoteAsset: pair.quote,
    price: 0,
    open: 0,
    previousClose: 0,
    high: 0,
    low: 0,
    change: 0,
    changeRatio: 0,
    volume: 0,
    quoteVolume: 0,
    source: 'binance',
    status: 'unavailable',
  };
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  const parsed = optionalNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function ratioFromUnknownPercent(value: unknown): number | undefined {
  const text = string(value).trim();
  return text && text !== '--' ? ratioFromText(text) : undefined;
}

function ratioFromText(value: unknown): number | undefined {
  const text = string(value).replace(/[%+,]/g, '').trim();
  if (!text || text === '--') return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Number((parsed / 100).toFixed(8)) : undefined;
}

function boundedStars(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 5 ? Math.trunc(parsed) : undefined;
}

function fundRiskLevel(value: unknown): string | undefined {
  return ({
    '1': 'Low risk',
    '2': 'Medium-low risk',
    '3': 'Medium risk',
    '4': 'Medium-high risk',
    '5': 'High risk',
  } as Record<string, string>)[string(value)];
}

function normalizedText(value: unknown): string {
  return string(value).replace(/\s+/g, ' ').trim();
}

async function decodeResponseText(response: Response): Promise<string> {
  const bytes = await response.arrayBuffer();
  const charset = /charset\s*=\s*["']?([^;\s"']+)/i.exec(response.headers.get('content-type') ?? '')?.[1]?.toLowerCase();
  const encoding = charset === 'gbk' || charset === 'gb2312' ? 'gb18030' : charset || 'utf-8';
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('gb18030').decode(bytes);
  }
}

type IwenCaiTable = { columns: string[]; rows: unknown[][] };

function iwenCaiTable(value: unknown): IwenCaiTable | undefined {
  const result = record(record(value)?.data)?.result;
  const table = record(result);
  const columns = Array.isArray(table?.indexID) ? table.indexID.map(string) : [];
  const rows = Array.isArray(table?.result)
    ? table.result.filter(Array.isArray).map((row) => row as unknown[])
    : [];
  return columns.length && rows.length ? { columns, rows } : undefined;
}

function tableValue(table: IwenCaiTable | undefined, rowIndex: number, key: string): string | undefined {
  if (!table) return undefined;
  const columnIndex = table.columns.findIndex((column) => column === key || column.startsWith(`${key}[`));
  if (columnIndex < 0) return undefined;
  const value = normalizedText(parse(string(table.rows[rowIndex]?.[columnIndex])).textContent);
  return value && value !== '--' ? value : undefined;
}

function isHexinToken(value: string): boolean {
  return value.length >= 16 && value.length <= 2048 && /^[\x21-\x7e]+$/.test(value);
}

function firstRejectedReason(results: readonly PromiseSettledResult<unknown>[]): Error {
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  return rejected?.reason instanceof Error ? rejected.reason : new Error('All iWencai requests failed.');
}

async function settled<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  try { return { status: 'fulfilled', value: await promise }; }
  catch (reason) { return { status: 'rejected', reason }; }
}

function parseChineseCnyAmount(value: string): number | undefined {
  const matched = /([\d,.]+)\s*(亿元|万元|元)/.exec(value);
  if (!matched) return undefined;
  const amount = Number(matched[1]!.replace(/,/g, ''));
  if (!Number.isFinite(amount)) return undefined;
  const multiplier = matched[2] === '亿元' ? 100_000_000 : matched[2] === '万元' ? 10_000 : 1;
  return amount * multiplier;
}

function ratioFromPercentPoints(value: string | undefined): number | undefined {
  if (!value || value === '--') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 100 : undefined;
}

function unavailableFund(code: string): FundQuote {
  return {
    code,
    name: code,
    nav: 0,
    accumulatedNav: 0,
    navDate: '',
    source: 'fund-api',
    status: 'unavailable',
  };
}
