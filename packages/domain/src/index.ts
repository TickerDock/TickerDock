export type Market = 'sh' | 'sz' | 'bj' | 'hk' | 'us' | 'cn-future' | 'global-future';

export type QuoteStatus = 'live' | 'unavailable';

export interface StockQuote {
  code: string;
  name: string;
  market: Market;
  price: number;
  previousClose: number;
  open?: number;
  high: number;
  low: number;
  change: number;
  changeRatio: number;
  volume?: number;
  turnover?: number;
  timestamp?: number;
  source: string;
  status: QuoteStatus;
}

export interface FundQuote {
  code: string;
  name: string;
  nav: number;
  accumulatedNav: number;
  navDate: string;
  navChangeRatio?: number;
  estimatedNav?: number;
  estimatedChangeRatio?: number;
  estimateTime?: string;
  source: string;
  status: QuoteStatus;
}

export interface Kline {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume?: number;
  source?: string;
}

export interface FundNav {
  date: string;
  nav: number;
  accumulatedNav: number;
  source: string;
}

export interface SearchResult {
  code: string;
  name: string;
}

export interface StockGateway {
  getQuotes(codes: readonly string[]): Promise<StockQuote[]>;
  search(keyword: string): Promise<SearchResult[]>;
  getKlines(
    code: string,
    options?: { period?: 'day' | 'week' | 'month'; count?: number; adjust?: 'none' | 'qfq' | 'hfq' }
  ): Promise<Kline[]>;
}

export interface FundGateway {
  getQuotes(codes: readonly string[]): Promise<FundQuote[]>;
  search(keyword: string): Promise<SearchResult[]>;
  getNavHistory(code: string): Promise<FundNav[]>;
}

export interface FundEstimate {
  code: string;
  estimatedNav: number;
  estimatedChangeRatio: number;
  estimateTime: string;
  confirmedNavDate: string;
  source: string;
}

export interface FundEstimateGateway {
  getEstimates(codes: readonly string[]): Promise<FundEstimate[]>;
}

export function mergeFundEstimates(
  quotes: readonly FundQuote[],
  estimates: readonly FundEstimate[]
): FundQuote[] {
  const byCode = new Map(estimates.map((estimate) => [estimate.code, estimate]));
  return quotes.map((quote) => {
    const estimate = byCode.get(quote.code);
    if (!estimate || !isEstimateCurrent(quote, estimate)) return quote;
    return {
      ...quote,
      estimatedNav: estimate.estimatedNav,
      estimatedChangeRatio: estimate.estimatedChangeRatio,
      estimateTime: estimate.estimateTime,
    };
  });
}

export interface StockPosition {
  code: string;
  quantity: number;
  costPrice: number;
  todayTradePrice?: number;
  soldOut?: boolean;
}

export interface FundPosition {
  code: string;
  shares: number;
  costNav: number;
}

export type Currency = 'CNY' | 'HKD' | 'USD';
export type CnyFxRates = Partial<Record<Currency, number>>;

export interface PositionProfit {
  code: string;
  name: string;
  marketValue: number;
  costBasis: number;
  totalProfit: number;
  totalReturnRatio: number;
  todayProfit: number;
  todayReturnRatio: number;
  realized: boolean;
  currency: Currency;
}

export interface PortfolioSummary {
  marketValue: number;
  costBasis: number;
  totalProfit: number;
  totalReturnRatio: number;
  todayProfit: number;
  todayReturnRatio: number;
  positions: PositionProfit[];
  excludedCurrencies: Currency[];
}

export interface StockReminderRule {
  kind: 'price' | 'changeRatio';
  direction: 'above' | 'below';
  threshold: number;
}

export interface StockReminderEvent {
  code: string;
  name: string;
  rule: StockReminderRule;
  value: number;
}

export interface CryptoQuote {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  open: number;
  previousClose: number;
  high: number;
  low: number;
  change: number;
  changeRatio: number;
  volume: number;
  quoteVolume: number;
  source: string;
  status: QuoteStatus;
}

export interface CryptoGateway {
  getQuotes(symbols: readonly string[]): Promise<CryptoQuote[]>;
  searchPairs(keyword: string): Promise<SearchResult[]>;
  getKlines(
    symbol: string,
    options?: { interval?: '1h' | '4h' | '1d' | '1w'; limit?: number }
  ): Promise<Kline[]>;
}

export interface ForexQuote {
  name: string;
  spotBuyPrice?: number;
  cashBuyPrice?: number;
  spotSellPrice?: number;
  cashSellPrice?: number;
  conversionPrice?: number;
  publishDate: string;
  publishTime: string;
  source: string;
}

export interface ForexGateway {
  getQuotes(): Promise<ForexQuote[]>;
}

export interface FlashNewsItem {
  id: string;
  title: string;
  summary: string;
  time: string;
  important: boolean;
  kind: 'news' | 'economic-data';
  source: string;
  url?: string;
}

export interface FlashNewsGateway {
  getLatest(limit?: number): Promise<FlashNewsItem[]>;
}

export interface StockResearchItem {
  id: string;
  title: string;
  summary: string;
  time: string;
  source: string;
  url: string;
}

export interface StockResearchGateway {
  search(keyword: string, limit?: number): Promise<StockResearchItem[]>;
}

export interface StockTechnicalLevels {
  currentPrice: number;
  movingAverage20?: number;
  movingAverage60?: number;
  support?: number;
  resistance?: number;
  takeProfit?: number;
  stopLoss?: number;
  sampleSize: number;
}

export interface StockDiagnosis {
  title: string;
  score?: number;
  short: string;
  mid: string;
  long: string;
  content: string;
}

export interface StockConcept {
  title: string;
  content?: string;
}

export interface StockInstitutionReport {
  reportDate: string;
  rating: string;
  previousRating: string;
  direction: string;
  targetPrice: string;
  researcher: string;
  iwencaiRating: string;
}

export interface StockIwenCaiInsights {
  diagnosis?: StockDiagnosis;
  concepts: StockConcept[];
  heat?: string;
  pressure?: string;
  support?: string;
  takeProfit?: string;
  stopLoss?: string;
  institutionReports: StockInstitutionReport[];
}

export interface StockIwenCaiGateway {
  getInsights(code: string, name: string, hexinToken: string): Promise<StockIwenCaiInsights>;
}

export interface StockExtendedDetail {
  code: string;
  name: string;
  changeRatio: number;
  technical: StockTechnicalLevels;
  iwencai?: StockIwenCaiInsights;
  research: StockResearchItem[];
  unavailableSources: string[];
}

export interface FundHolding {
  code: string;
  name: string;
  navRatio: number;
  sharesWan: number;
  marketValueWan: number;
  reportDate: string;
}

export interface FundPeriodReturns {
  week?: number;
  month?: number;
  threeMonth?: number;
  sixMonth?: number;
  year?: number;
  threeYear?: number;
  yearToDate?: number;
  sinceInception?: number;
}

export interface FundProfitProbability {
  week?: number;
  month?: number;
  threeMonth?: number;
  sixMonth?: number;
  year?: number;
}

export interface FundInstitutionRating {
  date: string;
  merchantSecurities?: number;
  jianFundEvaluation?: number;
  shanghaiSecurities?: number;
}

export interface SimilarFundPerformance {
  code: string;
  name: string;
  period: string;
  returnRatio?: number;
}

export interface FundExtendedDetail {
  code: string;
  name: string;
  fundType?: string;
  riskLevel?: string;
  sizeCny?: number;
  sizeDate?: string;
  manager?: string;
  establishedDate?: string;
  managementCompany?: string;
  ratingStars?: number;
  trackingTarget?: string;
  annualTrackingErrorRatio?: number;
  returns: FundPeriodReturns;
  profitProbability: FundProfitProbability;
  overallScore?: number;
  fundScore?: number;
  institutionRatings: FundInstitutionRating[];
  similarFunds: SimilarFundPerformance[];
  holdings: FundHolding[];
}

export interface FundRankItem {
  code: string;
  name: string;
  nav: number;
  navDate: string;
  dayReturnRatio: number;
  weekReturnRatio?: number;
  monthReturnRatio?: number;
  threeMonthReturnRatio?: number;
  sixMonthReturnRatio?: number;
  yearReturnRatio?: number;
  yearToDateReturnRatio?: number;
}

export interface FundFlowItem {
  code: string;
  name: string;
  netInflow: number;
  category: 'industry' | 'concept' | 'region';
}

export interface FundInsightsGateway {
  getDetail(code: string): Promise<FundExtendedDetail>;
  getHoldings(code: string): Promise<FundHolding[]>;
  getRanking(limit?: number): Promise<FundRankItem[]>;
  getFlows(category: FundFlowItem['category'], limit?: number): Promise<FundFlowItem[]>;
}

export interface MarketBreadthDistribution {
  limitUp: number;
  aboveFive: number;
  upOneToFive: number;
  upZeroToOne: number;
  flat: number;
  downZeroToOne: number;
  downOneToFive: number;
  belowFive: number;
  limitDown: number;
}

export interface MarketBreadthSummary {
  time: string;
  rising: number;
  falling: number;
  unchanged: number;
  limitUp: number;
  naturalLimitUp: number;
  limitDown: number;
  distribution: MarketBreadthDistribution;
}

export interface HotMarketTheme {
  code: string;
  name: string;
  changeRatio: number;
  leadingStockCode: string;
  leadingStockName: string;
  leadingStockChangeRatio: number;
}

export interface StockConnectFlowPoint {
  time: string;
  shanghaiNetInflowYi: number;
  shenzhenNetInflowYi: number;
  northboundNetInflowYi: number;
}

export interface MarketSentimentSnapshot {
  breadth?: MarketBreadthSummary;
  hotThemes: HotMarketTheme[];
  stockConnectFlow: StockConnectFlowPoint[];
}

export interface MarketSentimentGateway {
  getSnapshot(): Promise<MarketSentimentSnapshot>;
}

export interface SocialUser {
  id: string;
  name: string;
  description: string;
  source: string;
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  url: string;
  source: string;
}

export interface SocialFeedGateway {
  getUsers(userIds: readonly string[]): Promise<SocialUser[]>;
  getTimeline(userId: string): Promise<SocialPost[]>;
}

export function evaluateStockReminders(
  previous: StockQuote,
  current: StockQuote,
  rules: readonly StockReminderRule[]
): StockReminderEvent[] {
  if (previous.status !== 'live' || current.status !== 'live') return [];
  return rules.flatMap((rule) => {
    const oldValue = rule.kind === 'price' ? previous.price : previous.changeRatio;
    const newValue = rule.kind === 'price' ? current.price : current.changeRatio;
    const crossed = rule.direction === 'above'
      ? oldValue < rule.threshold && newValue >= rule.threshold
      : oldValue > rule.threshold && newValue <= rule.threshold;
    return crossed ? [{ code: current.code, name: current.name, rule, value: newValue }] : [];
  });
}

export function calculateStockProfit(
  quote: StockQuote,
  position: StockPosition
): PositionProfit | undefined {
  if (position.quantity <= 0 || position.costPrice <= 0 || quote.status !== 'live') return undefined;

  const referencePrice = quote.previousClose || quote.open || quote.price;
  const exitPrice = position.soldOut && position.todayTradePrice
    ? position.todayTradePrice
    : quote.price;
  const todayBasePrice = position.todayTradePrice && !position.soldOut
    ? position.todayTradePrice
    : referencePrice;
  const costBasis = position.quantity * position.costPrice;
  const totalProfit = position.quantity * (exitPrice - position.costPrice);
  const todayProfit = position.quantity * (
    position.soldOut ? exitPrice - referencePrice : quote.price - todayBasePrice
  );
  const marketValue = position.soldOut ? 0 : position.quantity * quote.price;
  const todayBasis = position.quantity * todayBasePrice;

  return {
    code: quote.code,
    name: quote.name,
    marketValue,
    costBasis,
    totalProfit,
    totalReturnRatio: safeRatio(totalProfit, costBasis),
    todayProfit,
    todayReturnRatio: safeRatio(todayProfit, todayBasis),
    realized: Boolean(position.soldOut),
    currency: currencyForMarket(quote.market),
  };
}

export function calculateFundProfit(
  quote: FundQuote,
  position: FundPosition
): PositionProfit | undefined {
  if (position.shares <= 0 || position.costNav <= 0 || quote.status !== 'live') return undefined;

  const valuationNav = quote.estimatedNav ?? quote.nav;
  const changeRatio = quote.estimatedChangeRatio ?? quote.navChangeRatio;
  const marketValue = position.shares * valuationNav;
  const costBasis = position.shares * position.costNav;
  const totalProfit = marketValue - costBasis;
  const previousNav = changeRatio === undefined || changeRatio <= -1
    ? valuationNav
    : valuationNav / (1 + changeRatio);
  const todayProfit = position.shares * (valuationNav - previousNav);
  const todayBasis = position.shares * previousNav;

  return {
    code: quote.code,
    name: quote.name,
    marketValue,
    costBasis,
    totalProfit,
    totalReturnRatio: safeRatio(totalProfit, costBasis),
    todayProfit,
    todayReturnRatio: safeRatio(todayProfit, todayBasis),
    realized: false,
    currency: 'CNY',
  };
}

export function summarizePortfolio(
  profits: readonly PositionProfit[],
  rates: CnyFxRates = { CNY: 1 }
): PortfolioSummary {
  const normalized: PositionProfit[] = [];
  const excluded = new Set<Currency>();
  for (const profit of profits) {
    const rate = profit.currency === 'CNY' ? 1 : rates[profit.currency];
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      excluded.add(profit.currency);
      continue;
    }
    normalized.push({
      ...profit,
      marketValue: profit.marketValue * rate,
      costBasis: profit.costBasis * rate,
      totalProfit: profit.totalProfit * rate,
      todayProfit: profit.todayProfit * rate,
      currency: 'CNY' as const,
    });
  }
  const marketValue = sum(normalized, ({ marketValue: value }) => value);
  const costBasis = sum(normalized, ({ costBasis: value }) => value);
  const totalProfit = sum(normalized, ({ totalProfit: value }) => value);
  const todayProfit = sum(normalized, ({ todayProfit: value }) => value);
  const todayBasis = sum(normalized, (profit) => {
    const currentValue = profit.marketValue || profit.costBasis + profit.totalProfit;
    return currentValue - profit.todayProfit;
  });

  return {
    marketValue,
    costBasis,
    totalProfit,
    totalReturnRatio: safeRatio(totalProfit, costBasis),
    todayProfit,
    todayReturnRatio: safeRatio(todayProfit, todayBasis),
    positions: normalized,
    excludedCurrencies: [...excluded],
  };
}

export function createCnyFxRates(quotes: readonly ForexQuote[]): CnyFxRates {
  const rates: CnyFxRates = { CNY: 1 };
  for (const quote of quotes) {
    const name = quote.name.trim().toUpperCase();
    const currency = /美元|USD/.test(name) ? 'USD' : /港币|港元|HKD/.test(name) ? 'HKD' : undefined;
    const quotedPerHundred = quote.spotSellPrice ?? quote.conversionPrice;
    if (currency && quotedPerHundred && Number.isFinite(quotedPerHundred) && quotedPerHundred > 0) {
      rates[currency] = quotedPerHundred / 100;
    }
  }
  return rates;
}

function currencyForMarket(market: Market): Currency {
  if (market === 'hk') return 'HKD';
  if (market === 'us' || market === 'global-future') return 'USD';
  return 'CNY';
}

export class UnsupportedMarketError extends Error {
  constructor(public readonly code: string) {
    super(`Unsupported stock market code: ${code}`);
    this.name = 'UnsupportedMarketError';
  }
}

export function marketFromLegacyCode(code: string): Market {
  const normalized = code.toLowerCase();
  if (normalized.startsWith('sh')) return 'sh';
  if (normalized.startsWith('sz')) return 'sz';
  if (normalized.startsWith('bj')) return 'bj';
  if (normalized.startsWith('hk')) return 'hk';
  if (normalized.startsWith('usr_') || normalized.startsWith('gb_') || normalized.startsWith('us')) return 'us';
  throw new UnsupportedMarketError(code);
}

export function toStockApiCode(code: string): string {
  const normalized = code.trim();
  const market = marketFromLegacyCode(normalized);
  if (market === 'us') {
    return `US${normalized.replace(/^(usr_|gb_|us)/i, '').toUpperCase()}`;
  }
  return `${market.toUpperCase()}${normalized.slice(market.length).toUpperCase()}`;
}

export function fromStockApiCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized.startsWith('US')) return `usr_${normalized.slice(2).toLowerCase()}`;
  if (/^(SH|SZ|BJ|HK)/.test(normalized)) return normalized.toLowerCase();
  throw new UnsupportedMarketError(code);
}

function safeRatio(value: number, basis: number): number {
  return basis === 0 ? 0 : value / basis;
}

function sum<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

function isEstimateCurrent(quote: FundQuote, estimate: FundEstimate): boolean {
  const estimateDate = estimate.estimateTime.slice(0, 10);
  return estimate.estimatedNav > 0
    && estimate.confirmedNavDate === quote.navDate
    && estimateDate > quote.navDate;
}
