export const PROTOCOL_VERSION = 1 as const;

export type PageKind = 'sectorManager' | 'stockPositions' | 'fundPositions' | 'personalization' | 'marketSentiment' | 'fundComparison' | 'fundOverview';
export type Sector = { code: string; name: string };
export type StockPosition = { code: string; quantity: number; costPrice: number; todayTradePrice?: number; soldOut: boolean };
export type FundPosition = { code: string; shares: number; costNav: number };
export type PositionItem = { code: string; name: string };
export type ChangeIconStyle = 'arrow' | 'arrow1' | 'food1' | 'food2' | 'food3' | 'iconfood' | 'none';
export type PersonalizationState = {
  sidebarDisplayMode: 'standard' | 'template';
  stockLabelTemplate: string;
  fundLabelTemplate: string;
  statusBarLabelTemplate: string;
  stockPortfolioTemplate: string;
  fundPortfolioTemplate: string;
  changeIconStyle: ChangeIconStyle;
  useCustomStatusBarColors: boolean;
  riseColor: string;
  fallColor: string;
  heldStockHighlightEnabled: boolean;
  remindersEnabled: boolean;
  marketHoursEnabled: boolean;
  stockChartMode: 'standard' | 'chips';
  showMarketStatusBar: boolean;
  showStockPortfolioStatusBar: boolean;
  showFundPortfolioStatusBar: boolean;
  showStatusBarIcons: boolean;
  statusBarStocks: string[];
  availableStocks: PositionItem[];
};
export type AiSettingsState = {
  baseUrl: string;
  model: string;
  apiMode: 'responses' | 'chat-completions';
  historyRange: '1w' | '1m' | '3m' | '6m' | '1y';
  hasApiKey: boolean;
};
export type StockResearchItem = { id: string; title: string; summary: string; time: string; source: string; url: string };
export type FundHolding = { code: string; name: string; navRatio: number; sharesWan: number; marketValueWan: number; reportDate: string };
export type FundRankItem = { code: string; name: string; nav: number; navDate: string; dayReturnRatio: number; weekReturnRatio?: number; monthReturnRatio?: number; threeMonthReturnRatio?: number; sixMonthReturnRatio?: number; yearReturnRatio?: number; yearToDateReturnRatio?: number };
export type FundFlowItem = { code: string; name: string; netInflow: number; category: 'industry' | 'concept' | 'region' };
export type FundNav = { date: string; nav: number; accumulatedNav: number; source: string };
export type StockKline = { date: string; open: number; close: number; high: number; low: number; volume?: number; source?: string };
export type FundQuote = { code: string; name: string; nav: number; accumulatedNav: number; navDate: string; navChangeRatio?: number; estimatedNav?: number; estimatedChangeRatio?: number; estimateTime?: string; source: string; status: string };
export type StockQuote = { code: string; name: string; market: string; price: number; previousClose: number; open: number; high: number; low: number; change: number; changeRatio: number; volume?: number; turnover?: number; source: string; status: string };
export type LeekCenterPage = { id: string; title: string; description: string; group: 'Market' | 'Trading' | 'Issuance' | 'Research'; url: string };
export type LeekCenterWatchlist = { stocks: Array<{ name: string; items: StockQuote[] }>; funds: Array<{ name: string; items: FundQuote[] }>; updatedAt: number };
export type FundComparisonSeries = { code: string; name: string; data: FundNav[] };
export type ComparisonControl = { id: string; label: string };
export type TrendControl = { id: string; label: string };
export type MarketSentimentSnapshot = {
  breadth?: { time: string; rising: number; falling: number; unchanged: number; limitUp: number; naturalLimitUp: number; limitDown: number; distribution: { limitUp: number; aboveFive: number; upOneToFive: number; upZeroToOne: number; flat: number; downZeroToOne: number; downOneToFive: number; belowFive: number; limitDown: number } };
  hotThemes: Array<{ code: string; name: string; changeRatio: number; leadingStockCode: string; leadingStockName: string; leadingStockChangeRatio: number }>;
  stockConnectFlow: Array<{ time: string; shanghaiNetInflowYi: number; shenzhenNetInflowYi: number; northboundNetInflowYi: number }>;
};
export type StockExtendedDetail = {
  code: string; name: string; changeRatio: number;
  technical: { currentPrice: number; movingAverage20?: number; movingAverage60?: number; support?: number; resistance?: number; takeProfit?: number; stopLoss?: number; sampleSize: number };
  iwencai?: { diagnosis?: { title: string; score?: number; short: string; mid: string; long: string; content: string }; concepts: Array<{ title: string; content?: string }>; heat?: string; pressure?: string; support?: string; takeProfit?: string; stopLoss?: string; institutionReports: Array<{ reportDate: string; rating: string; direction: string; targetPrice: string; researcher: string; iwencaiRating: string }> };
  research: StockResearchItem[]; unavailableSources: string[];
};
export type FundExtendedDetail = {
  code: string; name: string; fundType?: string; riskLevel?: string; sizeCny?: number; sizeDate?: string;
  manager?: string; establishedDate?: string; managementCompany?: string; ratingStars?: number;
  trackingTarget?: string; annualTrackingErrorRatio?: number;
  returns: Partial<Record<'week' | 'month' | 'threeMonth' | 'sixMonth' | 'year' | 'threeYear' | 'yearToDate' | 'sinceInception', number>>;
  profitProbability: Partial<Record<'week' | 'month' | 'threeMonth' | 'sixMonth' | 'year', number>>;
  overallScore?: number; fundScore?: number;
  institutionRatings: Array<{ date: string; merchantSecurities?: number; jianFundEvaluation?: number; shanghaiSecurities?: number }>;
  similarFunds: Array<{ code: string; name: string; period: string; returnRatio?: number }>;
  holdings: FundHolding[];
};

export type Bootstrap =
  | { page: 'sectorManager'; sectors: Sector[] }
  | { page: 'stockPositions'; items: PositionItem[]; positions: StockPosition[] }
  | { page: 'fundPositions'; items: PositionItem[]; positions: FundPosition[] }
  | { page: 'personalization'; state: PersonalizationState; defaults: PersonalizationState }
  | { page: 'aiSettings'; state: AiSettingsState }
  | { page: 'stockResearch'; name: string; items?: StockResearchItem[] }
  | { page: 'fundDetail'; title: string; detail?: FundExtendedDetail; error?: string }
  | { page: 'fundHoldings'; code: string; name: string; items?: FundHolding[]; error?: string }
  | { page: 'fundRanking'; items?: FundRankItem[]; error?: string }
  | { page: 'fundFlows'; industry?: FundFlowItem[]; concept?: FundFlowItem[]; region?: FundFlowItem[]; error?: string }
  | { page: 'marketSentiment'; snapshot?: MarketSentimentSnapshot; error?: string }
  | { page: 'fundComparison'; series?: FundComparisonSeries[]; failedCodes: string[]; controls: ComparisonControl[]; active: string; error?: string }
  | { page: 'fundOverview'; funds: FundQuote[]; selectedCode: string; history: FundNav[]; range: string; loading: boolean; error?: string }
  | { page: 'fundTrend'; title: string; data?: FundNav[]; controls: TrendControl[]; active: string; error?: string }
  | { page: 'stockKline'; title: string; code: string; data?: StockKline[]; controls: TrendControl[]; active: string; error?: string }
  | { page: 'stockMarketFrame'; title: string; targets?: { standard: string; chips?: string }; mode: 'standard' | 'chips'; error?: string }
  | { page: 'binanceFrame'; title: string; source: string }
  | { page: 'aiResult'; title: string; result: string }
  | { page: 'leekCenter'; pages: LeekCenterPage[]; initialPageId: string; watchlist: LeekCenterWatchlist }
  | { page: 'stockExtendedDetail'; title: string; detail?: StockExtendedDetail; error?: string };

export type HostMessage = {
  version: typeof PROTOCOL_VERSION;
  type: 'saveSectors' | 'saveStockPositions' | 'saveFundPositions' | 'savePersonalization' | 'saveAiSettings'
    | 'resetPersonalization' | 'saveStatusBarStocks' | 'openResearchUrl' | 'setDirty' | 'changeFundComparisonRange'
    | 'selectFundOverviewFund' | 'changeFundOverviewRange' | 'changeFundTrendRange' | 'changeStockChartMode' | 'changeStockKlinePeriod'
    | 'openLeekExternal' | 'refreshLeekWatchlist' | 'openLeekWatchlistDetails' | 'loadLeekStockDetails' | 'deleteAiKey'
    | 'requestAiKey';
  requestId: string;
  payload: unknown;
};

const vscode = window.acquireVsCodeApi?.();

export function postMessage(type: HostMessage['type'], payload: unknown): void {
  vscode?.postMessage({ version: PROTOCOL_VERSION, type, requestId: crypto.randomUUID(), payload });
}

declare global {
  interface Window {
    __TICKERDOCK_BOOTSTRAP__?: Bootstrap;
    __TICKERDOCK_GET_HEXIN_TOKEN__?: () => string;
    acquireVsCodeApi?: () => { postMessage(message: unknown): void; getState(): unknown; setState(state: unknown): void };
  }
}
