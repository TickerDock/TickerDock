import { commands, ExtensionContext, QuickPickItem, Uri, window, workspace } from 'vscode';
import {
  BinanceGateway,
  BocForexGateway,
  CompositeFlashNewsGateway,
  CompositeStockGateway,
  EastMoneyFundInsightsGateway,
  EastMoneyMarketSentimentGateway,
  FundApiGateway,
  Jin10FlashNewsGateway,
  IwenCaiStockInsightsGateway,
  JiuyangongsheResearchGateway,
  ConfirmedNavOnlyFundEstimateGateway,
  XuanGuBaoFlashNewsGateway,
} from '@tickerdock/data-sources';
import { calculateFundProfit, calculateStockProfit, createCnyFxRates, FlashNewsGateway, fromStockApiCode, FundEstimateGateway, FundPosition, FundQuote, mergeFundEstimates, StockGateway, StockPosition, StockQuote, StockReminderRule, StockResearchGateway } from '@tickerdock/domain';
import { ConfigRepository, FundWatchGroup, StockWatchGroup } from './configRepository';
import { PortfolioStatusBar } from './portfolioStatusBar';
import {
  FundGroupTreeItem,
  FundQuoteProvider,
  FundQuoteTreeItem,
  StockGroupTreeItem,
  StockQuoteProvider,
  StockQuoteTreeItem,
} from './quoteProviders';
import { RefreshController, RefreshReason } from './refreshController';
import { ReminderService } from './reminderService';
import { showFundHistory, showSectorHistory, showStockHistory, showStockKline } from './historyView';
import { CryptoProvider, CryptoTreeItem, ForexProvider } from './marketProviders';
import { moveCode } from './orderUtils';
import { showFundDetails, showFundFlows, showFundHoldings, showFundRanking } from './fundInsightsView';
import { showLeekCenter, updateLeekCenterWatchlist } from './leekCenter';
import { SecretRepository } from './secretRepository';
import { SectorProvider, SectorTreeItem } from './sectorModel';
import { showSectorManager } from './sectorManager';
import { analyzeStock, askAi, configureAi, configureAiHistoryRange, deleteAiKey } from './aiFeature';
import { registerSettingsCommands } from './settingsCommands';
import { MarketStatusBar } from './marketStatusBar';
import { normalizeStatusBarCodes } from './statusBarModel';
import { isMarketOpen, marketForStockCode } from './marketSchedule';
import { showFundComparison } from './fundComparisonView';
import { showFundOverview } from './fundOverviewView';
import { NewsOutputService } from './newsOutputService';
import { mergePositionManagerItems } from './positionManagerModel';
import { showFundPositionManager, showStockPositionManager } from './positionManagerView';
import { AiOutputService } from './aiOutputService';
import { showMarketSentiment } from './marketSentimentView';
import { SettingsProvider } from './settingsProvider';
import { registerLegacyCommandAliases } from './legacyCommandAliases';
import { showStockResearch } from './stockResearchView';
import { showStockExtendedDetails } from './stockExtendedDetailView';
import { loadStockExtendedDetail } from './stockExtendedDetailLoader';
import { researchKeywordForStockCode } from './stockAnalysisModel';
import { showPersonalization } from './personalizationView';
import { showBinanceIframe } from './binanceIframeView';
import { getEastMoneyProxy, stopEastMoneyProxy } from './eastMoneyProxy';
import { pickSearchResult } from './searchQuickPick';

const DEFAULT_STOCKS = ['SH000001', 'SH000300', 'HK00700', 'USIXIC'];
const DEFAULT_FUNDS = [['001632', '420009', '320007']];
const BACKGROUND_REFRESH_INTERVAL_MS = 60_000;

export async function activate(context: ExtensionContext): Promise<void> {
  context.subscriptions.push({ dispose: stopEastMoneyProxy });
  void getEastMoneyProxy().catch((error) => {
    console.error('[tickerdock] EastMoney proxy warm-up failed', error);
  });
  const config = new ConfigRepository();
  await config.migrateBetaNamespace();
  const secrets = new SecretRepository(context.secrets);
  const stockGateway = new CompositeStockGateway();
  const fundGateway = new FundApiGateway();
  const fundEstimateGateway = new ConfirmedNavOnlyFundEstimateGateway();
  const binanceGateway = new BinanceGateway();
  const forexGateway = new BocForexGateway();
  const flashNewsGateway = new Jin10FlashNewsGateway();
  const xuanGuBaoGateway = new XuanGuBaoFlashNewsGateway();
  const fundInsightsGateway = new EastMoneyFundInsightsGateway();
  const marketSentimentGateway = new EastMoneyMarketSentimentGateway();
  const stockResearchGateway = new JiuyangongsheResearchGateway();
  const iwencaiGateway = new IwenCaiStockInsightsGateway();
  const personalization = config.getPersonalization();
  const stockProvider = new StockQuoteProvider(
    config.getStockSortMode(),
    config.getHeldStockHighlightEnabled(),
    personalization,
    context.extensionUri
  );
  const fundProvider = new FundQuoteProvider(config.getFundSortMode(), personalization, context.extensionUri);
  const portfolioBar = new PortfolioStatusBar();
  const marketStatusBar = new MarketStatusBar();
  const reminderService = new ReminderService(config, context.globalState);
  const cryptoProvider = new CryptoProvider(config.getBinanceSortMode());
  const forexProvider = new ForexProvider();
  const sectorProvider = new SectorProvider();
  sectorProvider.setSectors(config.getSectors());
  const settingsProvider = new SettingsProvider();
  const newsOutput = new NewsOutputService();
  const aiOutput = new AiOutputService();
  const stockQuoteCache = new Map<string, StockQuote>();
  const portfolioFundQuoteCache = new Map<string, FundQuote>();
  const stockTree = window.createTreeView('tickerdock.stock', { treeDataProvider: stockProvider });
  const fundTree = window.createTreeView('tickerdock.fund', { treeDataProvider: fundProvider });
  const cryptoTree = window.createTreeView('tickerdock.binance', { treeDataProvider: cryptoProvider });
  const forexTree = window.createTreeView('tickerdock.forex', { treeDataProvider: forexProvider });
  if (!context.globalState.get<boolean>('portfolioVisibilitySemanticsV2', false)) {
    void config.repairLegacyFundPortfolioVisibility()
      .then(async () => {
        await context.globalState.update('portfolioVisibilitySemanticsV2', true);
        updateStatusBarOptions(config, portfolioBar, marketStatusBar);
      })
      .catch((error) => console.error('[tickerdock] Portfolio visibility migration failed', error));
  }
  const createNewsGateway = (): FlashNewsGateway => {
    const sources = config.getNewsSources();
    const gateways: FlashNewsGateway[] = [];
    if (sources.includes('jin10')) gateways.push(flashNewsGateway);
    if (sources.includes('xuangubao')) gateways.push(xuanGuBaoGateway);
    return new CompositeFlashNewsGateway(gateways);
  };
  const applyPersonalization = () => {
    const appearance = config.getPersonalization();
    stockProvider.setPersonalization(appearance);
    fundProvider.setPersonalization(appearance);
    updateStatusBarOptions(config, portfolioBar, marketStatusBar);
  };

  context.subscriptions.push(
    portfolioBar,
    marketStatusBar,
    reminderService,
    newsOutput,
    aiOutput,
    stockTree,
    fundTree,
    cryptoTree,
    forexTree,
    window.createTreeView('tickerdock.sector', { treeDataProvider: sectorProvider }),
    window.createTreeView('tickerdock.settings', { treeDataProvider: settingsProvider })
  );

  const refreshStocks = async (reason: RefreshReason) => {
    const groups = config.getStockGroups(DEFAULT_STOCKS);
    const codes = [...new Set(groups.flatMap(({ codes: values }) => values))];
    const requestedCodes = reason !== 'manual' && !stockTree.visible
      ? backgroundStockCodes(config, codes)
      : codes;
    const automatic = reason === 'scheduled' && config.getMarketHoursEnabled();
    const marketOpen = new Map<NonNullable<ReturnType<typeof marketForStockCode>>, boolean>();
    const fetchCodes = automatic
      ? requestedCodes.filter((code) => {
          const market = marketForStockCode(code);
          if (market === undefined) return true;
          const cached = marketOpen.get(market);
          if (cached !== undefined) return cached;
          const open = isMarketOpen(market);
          marketOpen.set(market, open);
          return open;
        })
      : requestedCodes;
    if (fetchCodes.length === 0) {
      if (!automatic && codes.length === 0) {
        stockQuoteCache.clear();
        marketStatusBar.updateQuotes([]);
        portfolioBar.updateStocks(stockProvider.setData(groups, [], config.getStockPositions()));
      }
      return;
    }
    try {
      const refreshed = await stockGateway.getQuotes(fetchCodes);
      refreshed.forEach((quote) => stockQuoteCache.set(quote.code, quote));
      const watchedCodes = new Set(codes);
      for (const code of stockQuoteCache.keys()) {
        if (!watchedCodes.has(code)) stockQuoteCache.delete(code);
      }
      const quotes = codes.flatMap((code) => {
        const quote = stockQuoteCache.get(code);
        return quote ? [quote] : [];
      });
      marketStatusBar.updateQuotes(quotes);
      const profits = stockProvider.setData(groups, quotes, config.getStockPositions());
      portfolioBar.updateStocks(profits);
      void updateLeekCenterWatchlist(getLeekCenterWatchlist);
      await reminderService.process(quotes);
    } catch (error) {
      console.error('[tickerdock] Stock refresh failed', error);
    }
  };

  const refreshFunds = async (reason: RefreshReason) => {
    if (reason === 'scheduled' && config.getMarketHoursEnabled() && !isMarketOpen('fund')) return;
    const groups = config.getFundGroups(DEFAULT_FUNDS);
    const codes = [...new Set(groups.flatMap(({ codes: values }) => values))];
    const fundPositions = config.getFundPositions();
    const requestedCodes = reason !== 'manual' && !fundTree.visible
      ? codes.filter((code) => fundPositions.has(code))
      : codes;
    if (requestedCodes.length === 0) {
      if (codes.length === 0) portfolioBar.updateFunds(fundProvider.setData(groups, [], fundPositions));
      return;
    }
    try {
      const [quotes, estimates] = await Promise.all([
        fundGateway.getQuotes(requestedCodes),
        fundEstimateGateway.getEstimates(requestedCodes),
      ]);
      const mergedQuotes = mergeFundEstimates(quotes, estimates);
      const profits = fundProvider.setData(groups, mergedQuotes, fundPositions);
      portfolioBar.updateFunds(profits);
      void updateLeekCenterWatchlist(getLeekCenterWatchlist);
    } catch (error) {
      console.error('[tickerdock] Fund refresh failed', error);
    }
  };

  const refreshMarketStatusBar = async (reason: RefreshReason) => {
    const codes = config.getStatusBarStocks(['SH000001']);
    if (codes.length === 0) {
      marketStatusBar.updateQuotes([]);
      return;
    }
    const fetchCodes = filterStockCodesForRefresh(codes, reason, config.getMarketHoursEnabled());
    if (fetchCodes.length === 0) return;
    try {
      const refreshed = await stockGateway.getQuotes(fetchCodes);
      refreshed.forEach((quote) => stockQuoteCache.set(quote.code, quote));
      marketStatusBar.updateQuotes(codes.flatMap((code) => {
        const quote = stockQuoteCache.get(code);
        return quote ? [quote] : [];
      }));
    } catch (error) {
      console.error('[tickerdock] Market status bar refresh failed', error);
    }
  };

  const refreshPortfolioStatusBar = async (reason: RefreshReason) => {
    await Promise.all([
      (async () => {
        if (!config.getShowStockPortfolioStatusBar()) return;
        const positions = config.getStockPositions();
        const codes = [...positions.keys()];
        if (codes.length === 0) {
          portfolioBar.updateStocks([]);
          return;
        }
        const fetchCodes = filterStockCodesForRefresh(codes, reason, config.getMarketHoursEnabled());
        if (fetchCodes.length === 0) return;
        try {
          const refreshed = await stockGateway.getQuotes(fetchCodes);
          refreshed.forEach((quote) => stockQuoteCache.set(quote.code, quote));
          portfolioBar.updateStocks(codes.flatMap((code) => {
            const quote = stockQuoteCache.get(code);
            const position = positions.get(code);
            const profit = quote && position ? calculateStockProfit(quote, position) : undefined;
            return profit ? [profit] : [];
          }));
        } catch (error) {
          console.error('[tickerdock] Stock portfolio status bar refresh failed', error);
        }
      })(),
      (async () => {
        if (!config.getShowFundPortfolioStatusBar()) return;
        const positions = config.getFundPositions();
        const codes = [...positions.keys()];
        if (codes.length === 0) {
          portfolioBar.updateFunds([]);
          return;
        }
        if (reason === 'scheduled' && config.getMarketHoursEnabled() && !isMarketOpen('fund')) return;
        try {
          const [quotes, estimates] = await Promise.all([
            fundGateway.getQuotes(codes),
            fundEstimateGateway.getEstimates(codes),
          ]);
          mergeFundEstimates(quotes, estimates).forEach((quote) => portfolioFundQuoteCache.set(quote.code, quote));
          portfolioBar.updateFunds(codes.flatMap((code) => {
            const quote = portfolioFundQuoteCache.get(code);
            const position = positions.get(code);
            const profit = quote && position ? calculateFundProfit(quote, position) : undefined;
            return profit ? [profit] : [];
          }));
        } catch (error) {
          console.error('[tickerdock] Fund portfolio status bar refresh failed', error);
        }
      })(),
    ]);
  };

  const stockRefresh = new RefreshController(config.getInterval(), refreshStocks);
  const fundRefresh = new RefreshController(config.getInterval(), refreshFunds);
  const marketStatusRefresh = new RefreshController(config.getMarketStatusBarInterval(), refreshMarketStatusBar);
  const portfolioStatusRefresh = new RefreshController(config.getPortfolioStatusBarInterval(), refreshPortfolioStatusBar);
  const cryptoRefresh = new RefreshController(config.getBinanceInterval(), async () => {
    try {
      cryptoProvider.setQuotes(await binanceGateway.getQuotes(config.getBinancePairs()));
    } catch (error) {
      console.error('[tickerdock] Binance refresh failed', error);
    }
  });
  const forexRefresh = new RefreshController(config.getForexInterval(), async () => {
    try {
      const quotes = await forexGateway.getQuotes();
      forexProvider.setQuotes(quotes);
      portfolioBar.setFxRates(createCnyFxRates(quotes));
    } catch (error) {
      console.error('[tickerdock] Forex refresh failed', error);
    }
  });
  const newsRefresh = new RefreshController(config.getNewsInterval(), async () => {
    try {
      const news = await createNewsGateway().getLatest(60);
      newsOutput.process(config.getImportantNewsOnly() ? news.filter((item) => item.important) : news);
    } catch (error) {
      console.error('[tickerdock] Flash news refresh failed', error);
    }
  });
  context.subscriptions.push(
    stockRefresh, fundRefresh, marketStatusRefresh, portfolioStatusRefresh,
    cryptoRefresh, forexRefresh, newsRefresh
  );
  context.subscriptions.push(newsOutput.onDidChangeOpen((open) => {
    if (open) newsRefresh.start();
    else newsRefresh.stop();
  }));
  const syncRefreshScheduling = () => {
    const stockPositions = config.getStockPositions();
    const hasStockReminders = config.getRemindersEnabled()
      && [...config.getStockReminders().values()].some((rules) => rules.length > 0);
    scheduleForVisibility(
      stockRefresh,
      stockTree.visible || hasStockReminders,
      stockTree.visible ? config.getInterval() : Math.max(config.getInterval(), BACKGROUND_REFRESH_INTERVAL_MS)
    );

    scheduleForVisibility(fundRefresh, fundTree.visible, config.getInterval());
    scheduleForVisibility(
      marketStatusRefresh,
      config.getShowMarketStatusBar() && config.getStatusBarStocks(['SH000001']).length > 0,
      config.getMarketStatusBarInterval()
    );
    scheduleForVisibility(
      portfolioStatusRefresh,
      (config.getShowStockPortfolioStatusBar() && stockPositions.size > 0)
        || (config.getShowFundPortfolioStatusBar() && config.getFundPositions().size > 0),
      config.getPortfolioStatusBarInterval()
    );
    scheduleForVisibility(cryptoRefresh, cryptoTree.visible, config.getBinanceInterval());

    const needsForeignRates = config.getShowStockPortfolioStatusBar()
      && [...stockPositions.keys()].some((code) => {
        const market = marketForStockCode(code);
        return market === 'hk' || market === 'us' || market === 'global-future';
      });
    scheduleForVisibility(
      forexRefresh,
      forexTree.visible || needsForeignRates,
      config.getForexInterval()
    );
  };
  context.subscriptions.push(
    stockTree.onDidChangeVisibility(({ visible }) => {
      syncRefreshScheduling();
      if (visible) void stockRefresh.refreshNow();
    }),
    fundTree.onDidChangeVisibility(syncRefreshScheduling),
    cryptoTree.onDidChangeVisibility(syncRefreshScheduling),
    forexTree.onDidChangeVisibility(syncRefreshScheduling)
  );

  registerCommands(
    context, config, stockGateway, fundGateway,
    stockProvider, fundProvider, fundInsightsGateway, fundEstimateGateway, stockResearchGateway,
    context.extensionUri, stockRefresh, fundRefresh
  );
  registerMarketCommands(context, config, binanceGateway, cryptoProvider, cryptoRefresh, forexRefresh);
  registerSettingsCommands(context);
  registerStatusBarCommands(context, config, portfolioBar, marketStatusBar);
  await registerLegacyCommandAliases(context);
  newsOutput.setEnabled(config.getFlashNewsOutputEnabled());
  newsOutput.setNotificationsEnabled(config.getFlashNewsNotificationsEnabled());
  const getLeekCenterWatchlist = () => ({
    stocks: stockProvider.getWatchlistGroups(),
    funds: fundProvider.getWatchlistGroups(),
    updatedAt: Date.now(),
  });
  const openLeekCenter = (initialPageId?: string) => showLeekCenter(initialPageId, {
    extensionUri: context.extensionUri,
    watchlist: getLeekCenterWatchlist(),
    refreshWatchlist: async () => {
      await Promise.all([stockRefresh.refreshNow(), fundRefresh.refreshNow()]);
      return getLeekCenterWatchlist();
    },
    openWatchlistDetails: (kind, code, name) => kind === 'stock'
      ? showStockExtendedDetails(stockGateway, stockResearchGateway, context.extensionUri, code, name)
      : showFundDetails(fundInsightsGateway, context.extensionUri, code, name),
    loadStockDetails: (code, name, token) => loadStockExtendedDetail(stockGateway, stockResearchGateway, iwencaiGateway, code, name, token),
  });
  context.subscriptions.push(
    commands.registerCommand('tickerdock.openLeekCenter', () => openLeekCenter()),
    commands.registerCommand('tickerdock.manageSectors', () =>
      showSectorManager(context.extensionUri, config, (sectors) => sectorProvider.setSectors(sectors))
    ),
    commands.registerCommand('tickerdock.openSector', (item: SectorTreeItem) =>
      showSectorHistory(context.extensionUri, item.sector.code, item.sector.name)
    ),
    commands.registerCommand('tickerdock.openStockConnectFlow', () => openLeekCenter('northbound-flow')),
    commands.registerCommand('tickerdock.openMainCapitalFlow', () => openLeekCenter('main-capital-flow')),
    commands.registerCommand('tickerdock.viewMarketSentiment', () => showMarketSentiment(marketSentimentGateway, context.extensionUri)),
    commands.registerCommand('tickerdock.showNewsOutput', () => {
      newsOutput.show();
    }),
    commands.registerCommand('tickerdock.toggleNewsOutput', async () => {
      const enabled = !config.getFlashNewsOutputEnabled();
      await config.setFlashNewsOutputEnabled(enabled);
      newsOutput.setEnabled(enabled);
      void window.showInformationMessage(`Flash news output ${enabled ? 'enabled' : 'disabled'}.`);
    }),
    commands.registerCommand('tickerdock.configureAi', () => configureAi(context.extensionUri, config, secrets)),
    commands.registerCommand('tickerdock.openSettings', () =>
      commands.executeCommand('workbench.action.openSettings', '@ext:tickerdock.tickerdock')
    ),
    commands.registerCommand('tickerdock.openPersonalization', () =>
      showPersonalization(context.extensionUri, config, applyPersonalization, watchedStockOptions(config, stockProvider))
    ),
    commands.registerCommand('tickerdock.configureAiHistoryRange', () => configureAiHistoryRange(config)),
    commands.registerCommand('tickerdock.deleteAiKey', () => deleteAiKey(secrets)),
    commands.registerCommand('tickerdock.askAi', () => askAi(context.extensionUri, config, secrets, aiOutput)),
    commands.registerCommand('tickerdock.showAiOutput', () => aiOutput.show()),
    commands.registerCommand('tickerdock.clearAiOutput', () => {
      aiOutput.clear();
      void window.showInformationMessage('AI research output cleared.');
    }),
    commands.registerCommand('tickerdock.toggleMarketHours', async () => {
      const enabled = !config.getMarketHoursEnabled();
      await config.setMarketHoursEnabled(enabled);
      void window.showInformationMessage(`Market-hours scheduling ${enabled ? 'enabled' : 'disabled'}.`);
    }),
    commands.registerCommand('tickerdock.toggleStockChartMode', async (on?: number | boolean) => {
      const mode = on === undefined
        ? config.getStockChartMode() === 'chips' ? 'standard' : 'chips'
        : on ? 'chips' : 'standard';
      await config.setStockChartMode(mode);
      void window.showInformationMessage(`Default stock chart mode: ${mode}.`);
    }),
    commands.registerCommand('tickerdock.toggleHeldStockHighlight', async () => {
      const enabled = !config.getHeldStockHighlightEnabled();
      await config.setHeldStockHighlightEnabled(enabled);
      stockProvider.setHeldHighlightEnabled(enabled);
      void window.showInformationMessage(`Held-stock highlighting ${enabled ? 'enabled' : 'disabled'}.`);
    }),
    commands.registerCommand('tickerdock.toggleReminders', async (on?: number | boolean) => {
      const enabled = on === undefined ? !config.getRemindersEnabled() : Boolean(on);
      await config.setRemindersEnabled(enabled);
      void window.showInformationMessage(`Stock reminders ${enabled ? 'enabled' : 'disabled'}.`);
    }),
    commands.registerCommand('tickerdock.viewStockResearch', (item: StockQuoteTreeItem) => {
      const query = researchKeywordForStockCode(item.code);
      if (!query) {
        void window.showInformationMessage('Jiuyangongshe research is available for A-share stocks.');
        return;
      }
      return showStockResearch(
        stockResearchGateway,
        query,
        item.name,
        context.extensionUri
      );
    }),
    commands.registerCommand('tickerdock.analyzeStock', (item: StockQuoteTreeItem) =>
      analyzeStock(
        context.extensionUri,
        item.code,
        item.name,
        stockGateway,
        createNewsGateway(),
        stockResearchGateway,
        config,
        secrets,
        aiOutput
      ))
  );
  context.subscriptions.push(workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('tickerdock.interval') || event.affectsConfiguration('leek-fund.interval')) {
      const interval = config.getInterval();
      stockRefresh.updateInterval(interval);
      fundRefresh.updateInterval(interval);
    }
    if (event.affectsConfiguration('tickerdock') || event.affectsConfiguration('leek-fund')) {
      stockProvider.setSortMode(config.getStockSortMode());
      stockProvider.setHeldHighlightEnabled(config.getHeldStockHighlightEnabled());
      stockProvider.setPersonalization(config.getPersonalization());
      fundProvider.setSortMode(config.getFundSortMode());
      fundProvider.setPersonalization(config.getPersonalization());
      cryptoProvider.setSortMode(config.getBinanceSortMode());
      updateStatusBarOptions(config, portfolioBar, marketStatusBar);
      if (affectsAnyConfiguration(event, ['stocks', 'stockGroups', 'stockLists', 'stockPrice'])) void stockRefresh.refreshNow();
      if (affectsAnyConfiguration(event, ['funds', 'fundGroups', 'fundAmount'])) void fundRefresh.refreshNow();
      if (affectsAnyConfiguration(event, ['stocks', 'stockGroups', 'stockLists', 'statusBarStocks', 'showMarketStatusBar'])) {
        void marketStatusRefresh.refreshNow();
      }
      if (affectsAnyConfiguration(event, [
        'stockPrice', 'fundAmount', 'showStockPortfolioStatusBar', 'showFundPortfolioStatusBar',
      ])) {
        void portfolioStatusRefresh.refreshNow();
      }
    }
    if (event.affectsConfiguration('tickerdock.binanceInterval')) {
      cryptoRefresh.updateInterval(config.getBinanceInterval());
    }
    if (event.affectsConfiguration('tickerdock.forexInterval')) {
      forexRefresh.updateInterval(config.getForexInterval());
    }
    if (event.affectsConfiguration('tickerdock.newsInterval')) {
      newsRefresh.updateInterval(config.getNewsInterval());
    }
    if (event.affectsConfiguration('tickerdock.importantNewsOnly')) {
      if (newsOutput.isOpen) void newsRefresh.refreshNow();
    }
    if (event.affectsConfiguration('tickerdock.newsSources')) {
      if (newsOutput.isOpen) void newsRefresh.refreshNow();
    }
    if (event.affectsConfiguration('tickerdock.flashNewsOutputEnabled')) {
      newsOutput.setEnabled(config.getFlashNewsOutputEnabled());
    }
    if (event.affectsConfiguration('tickerdock.flashNewsNotificationsEnabled')) {
      newsOutput.setNotificationsEnabled(config.getFlashNewsNotificationsEnabled());
    }
    if (event.affectsConfiguration('tickerdock.sectors')) sectorProvider.setSectors(config.getSectors());
    syncRefreshScheduling();
  }));

  updateStatusBarOptions(config, portfolioBar, marketStatusBar);
  syncRefreshScheduling();
}

function scheduleForVisibility(controller: RefreshController, active: boolean, intervalMs: number): void {
  controller.updateInterval(intervalMs);
  if (active) controller.start();
  else controller.stop();
}

function backgroundStockCodes(config: ConfigRepository, watchedCodes: readonly string[]): string[] {
  const required = new Set<string>();
  if (config.getRemindersEnabled()) {
    config.getStockReminders().forEach((rules, code) => {
      if (rules.length > 0) required.add(code);
    });
  }
  return watchedCodes.filter((code) => required.has(code));
}

function filterStockCodesForRefresh(
  codes: readonly string[],
  reason: RefreshReason,
  marketHoursEnabled: boolean
): string[] {
  if (reason !== 'scheduled' || !marketHoursEnabled) return [...codes];
  const marketOpen = new Map<NonNullable<ReturnType<typeof marketForStockCode>>, boolean>();
  return codes.filter((code) => {
    const market = marketForStockCode(code);
    if (market === undefined) return true;
    const cached = marketOpen.get(market);
    if (cached !== undefined) return cached;
    const open = isMarketOpen(market);
    marketOpen.set(market, open);
    return open;
  });
}

function affectsAnyConfiguration(
  event: { affectsConfiguration(section: string): boolean },
  keys: readonly string[]
): boolean {
  return keys.some((key) =>
    event.affectsConfiguration(`tickerdock.${key}`) || event.affectsConfiguration(`leek-fund.${key}`)
  );
}

function registerStatusBarCommands(
  context: ExtensionContext,
  config: ConfigRepository,
  portfolioBar: PortfolioStatusBar,
  marketStatusBar: MarketStatusBar
): void {
  const update = () => updateStatusBarOptions(config, portfolioBar, marketStatusBar);
  context.subscriptions.push(
    commands.registerCommand('tickerdock.viewStockHistoryByCode', (code: string, name?: string) => showStockHistory(
      context.extensionUri, code, name || code, config.getStockChartMode(), (mode) => config.setStockChartMode(mode)
    )),
    commands.registerCommand('tickerdock.togglePortfolioStatusBar', async () => {
      const visible = config.getShowStockPortfolioStatusBar() || config.getShowFundPortfolioStatusBar();
      await config.setShowPortfolio(!visible);
      update();
    }),
    commands.registerCommand('tickerdock.toggleAllStatusBars', async () => {
      const visible = config.getShowStockPortfolioStatusBar()
        || config.getShowFundPortfolioStatusBar()
        || config.getShowMarketStatusBar();
      await Promise.all([
        config.setShowPortfolio(!visible),
        config.setShowMarketStatusBar(!visible),
      ]);
      update();
    }),
    commands.registerCommand('tickerdock.toggleStockPortfolioStatusBar', async () => {
      await config.setShowStockPortfolioStatusBar(!config.getShowStockPortfolioStatusBar());
      update();
    }),
    commands.registerCommand('tickerdock.toggleFundPortfolioStatusBar', async () => {
      await config.setShowFundPortfolioStatusBar(!config.getShowFundPortfolioStatusBar());
      update();
    }),
    commands.registerCommand('tickerdock.toggleMarketStatusBar', async () => {
      await config.setShowMarketStatusBar(!config.getShowMarketStatusBar());
      update();
    }),
    commands.registerCommand('tickerdock.toggleStatusBarIcons', async () => {
      await config.setShowStatusBarIcons(!config.getShowStatusBarIcons());
      update();
    }),
    commands.registerCommand('tickerdock.addStockToStatusBar', async (item: StockQuoteTreeItem) => {
      const watched = config.getStocks(DEFAULT_STOCKS);
      const selected = config.getStatusBarStocks(['SH000001']);
      if (selected.includes(item.code)) {
        void window.showInformationMessage(`${item.code} is already shown in the status bar.`);
        return;
      }
      if (selected.length >= 8) {
        void window.showWarningMessage('The status bar supports at most eight market quotes.');
        return;
      }
      await config.setStatusBarStocks(normalizeStatusBarCodes([...selected, item.code], watched));
      update();
    }),
    commands.registerCommand('tickerdock.removeStockFromStatusBar', async (item: StockQuoteTreeItem) => {
      await config.setStatusBarStocks(config.getStatusBarStocks(['SH000001']).filter((code) => code !== item.code));
      update();
    }),
    commands.registerCommand('tickerdock.configureStatusBarStocks', async () => {
      const watched = config.getStocks(DEFAULT_STOCKS);
      const current = new Set(config.getStatusBarStocks(['SH000001']));
      const selected = await window.showQuickPick(watched.map((code) => ({
        label: code,
        picked: current.has(code),
      })), {
        canPickMany: true,
        placeHolder: 'Select up to eight market quotes',
      });
      if (!selected) return;
      if (selected.length > 8) {
        void window.showWarningMessage('Select at most eight market quotes.');
        return;
      }
      await config.setStatusBarStocks(normalizeStatusBarCodes(selected.map(({ label }) => label), watched));
      update();
    })
  );
}

function watchedStockOptions(
  config: ConfigRepository,
  provider: StockQuoteProvider
): Array<{ code: string; name: string }> {
  const names = new Map(provider.getWatchItems().map((item) => [item.code, item.name]));
  return config.getStocks(DEFAULT_STOCKS).map((code) => ({ code, name: names.get(code) || code }));
}

function updateStatusBarOptions(
  config: ConfigRepository,
  portfolioBar: PortfolioStatusBar,
  marketStatusBar: MarketStatusBar
): void {
  const appearance = config.getPersonalization();
  portfolioBar.setPersonalization(appearance);
  portfolioBar.setVisibility(
    config.getShowStockPortfolioStatusBar(),
    config.getShowFundPortfolioStatusBar()
  );
  marketStatusBar.setOptions({
    visible: config.getShowMarketStatusBar(),
    showIcons: config.getShowStatusBarIcons(),
    codes: config.getStatusBarStocks(['SH000001']),
    appearance,
  });
}

function registerMarketCommands(
  context: ExtensionContext,
  config: ConfigRepository,
  binanceGateway: BinanceGateway,
  cryptoProvider: CryptoProvider,
  cryptoRefresh: RefreshController,
  forexRefresh: RefreshController
): void {
  context.subscriptions.push(
    commands.registerCommand('tickerdock.refreshBinance', () => cryptoRefresh.refreshNow()),
    commands.registerCommand('tickerdock.refreshForex', () => forexRefresh.refreshNow()),
    commands.registerCommand('tickerdock.viewBinanceHistory', (item: CryptoTreeItem) =>
      showBinanceIframe(context.extensionUri, item.symbol, treeItemLabel(item))),
    commands.registerCommand('tickerdock.sortBinance', async () => {
      const mode = cryptoProvider.cycleSort();
      await config.setBinanceSortMode(mode);
      window.setStatusBarMessage(`Binance sort: ${mode}`, 1500);
    }),
    commands.registerCommand('tickerdock.addBinancePair', async () => {
      const selected = await pickSearchResult(
        'Add Binance Pair',
        'Type a trading pair, base asset, or quote asset',
        (keyword) => binanceGateway.searchPairs(keyword)
      );
      if (!selected) return;
      await config.setBinancePairs([...config.getBinancePairs(), selected.code]);
      await cryptoRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.deleteBinancePair', async (item: CryptoTreeItem) => {
      await config.setBinancePairs(config.getBinancePairs().filter((symbol) => symbol !== item.symbol));
      await cryptoRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.binanceTop', async (item: CryptoTreeItem) => {
      await config.setBinancePairs(moveCode(config.getBinancePairs(), item.symbol, 'top'));
      await cryptoRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.binanceUp', async (item: CryptoTreeItem) => {
      await config.setBinancePairs(moveCode(config.getBinancePairs(), item.symbol, 'up'));
      await cryptoRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.binanceDown', async (item: CryptoTreeItem) => {
      await config.setBinancePairs(moveCode(config.getBinancePairs(), item.symbol, 'down'));
      await cryptoRefresh.refreshNow();
    })
  );
}

function registerCommands(
  context: ExtensionContext,
  config: ConfigRepository,
  stockGateway: StockGateway,
  fundGateway: FundApiGateway,
  stockProvider: StockQuoteProvider,
  fundProvider: FundQuoteProvider,
  fundInsightsGateway: EastMoneyFundInsightsGateway,
  fundEstimateGateway: FundEstimateGateway,
  stockResearchGateway: StockResearchGateway,
  extensionUri: Uri,
  stockRefresh: RefreshController,
  fundRefresh: RefreshController
): void {
  context.subscriptions.push(
    commands.registerCommand('tickerdock.refreshStock', () => stockRefresh.refreshNow()),
    commands.registerCommand('tickerdock.refreshFund', () => fundRefresh.refreshNow()),
    commands.registerCommand('tickerdock.viewStockHistory', (item: StockQuoteTreeItem) =>
      showStockHistory(
        extensionUri,
        item.code,
        item.name,
        config.getStockChartMode(),
        (mode) => config.setStockChartMode(mode),
        stockGateway
      )),
    commands.registerCommand('tickerdock.viewStockDetails', (item: StockQuoteTreeItem) =>
      isIndexStock(item.code, item.name)
        ? showStockKline(stockGateway, extensionUri, item.code, item.name)
        : showStockExtendedDetails(stockGateway, stockResearchGateway, extensionUri, item.code, item.name)),
    commands.registerCommand('tickerdock.viewFundHistory', (item: FundQuoteTreeItem) =>
      showFundHistory(fundGateway, extensionUri, item.code, item.name)),
    commands.registerCommand('tickerdock.viewFundDetails', (item: FundQuoteTreeItem) =>
      showFundDetails(fundInsightsGateway, extensionUri, item.code, item.name)),
    commands.registerCommand('tickerdock.viewFundHoldings', (item: FundQuoteTreeItem) => showFundHoldings(fundInsightsGateway, extensionUri, item.code, item.name)),
    commands.registerCommand('tickerdock.viewFundRanking', () => showFundRanking(fundInsightsGateway, extensionUri)),
    commands.registerCommand('tickerdock.viewFundFlows', () => showFundFlows(fundInsightsGateway, extensionUri)),
    commands.registerCommand('tickerdock.viewFundComparison', async () => {
      const funds = fundProvider.getWatchItems();
      if (funds.length < 2) {
        void window.showWarningMessage('Add at least two funds before opening a comparison.');
        return;
      }
      const selected = await window.showQuickPick(funds.map((fund, index) => ({
        label: fund.name,
        description: fund.code,
        picked: index < 4,
        fund,
      })), {
        canPickMany: true,
        placeHolder: 'Select 2 to 6 funds to compare',
      });
      if (!selected) return;
      if (selected.length < 2 || selected.length > 6) {
        void window.showWarningMessage('Select between two and six funds.');
        return;
      }
      await showFundComparison(fundGateway, extensionUri, selected.map(({ fund }) => fund));
    }),
    commands.registerCommand('tickerdock.viewFundOverview', () =>
      showFundOverview(fundGateway, fundEstimateGateway, extensionUri, fundProvider.getWatchItems())),
    commands.registerCommand('tickerdock.sortStock', async () => {
      const mode = stockProvider.cycleSort();
      await config.setStockSortMode(mode);
      window.setStatusBarMessage(`Stock sort: ${mode}`, 1500);
    }),
    commands.registerCommand('tickerdock.sortFund', async () => {
      const mode = fundProvider.cycleSort();
      await config.setFundSortMode(mode);
      window.setStatusBarMessage(`Fund sort: ${mode}`, 1500);
    }),
    commands.registerCommand('tickerdock.sortFundAmount', async () => {
      const mode = fundProvider.cycleAmountSort();
      await config.setFundSortMode(mode);
      window.setStatusBarMessage(`Fund position sort: ${mode}`, 1500);
    }),
    commands.registerCommand('tickerdock.manageStockPositions', () => {
      const positions = config.getStockPositions();
      const names = new Map(stockProvider.getWatchItems().map((item) => [item.code, item.name]));
      const watched = config.getStocks(DEFAULT_STOCKS).map((code) => ({ code, name: names.get(code) || code }));
      const items = mergePositionManagerItems(watched, positions.keys());
      showStockPositionManager(extensionUri, items, positions, (values) => config.replaceStockPositions(values));
    }),
    commands.registerCommand('tickerdock.manageFundPositions', () => {
      const positions = config.getFundPositions();
      const names = new Map(fundProvider.getWatchItems().map((item) => [item.code, item.name]));
      const codes = [...new Set(config.getFundGroups(DEFAULT_FUNDS).flatMap(({ codes: values }) => values))];
      const watched = codes.map((code) => ({ code, name: names.get(code) || code }));
      const items = mergePositionManagerItems(watched, positions.keys());
      showFundPositionManager(extensionUri, items, positions, (values) => config.replaceFundPositions(values));
    }),
    commands.registerCommand('tickerdock.addStockGroup', async () => {
      const name = await window.showInputBox({ prompt: 'Stock group name', ignoreFocusOut: true });
      if (!name?.trim()) return;
      const groups = config.getStockGroups(DEFAULT_STOCKS);
      await config.setStockGroups([...groups, { name: name.trim(), codes: [] }]);
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.renameStockGroup', async (item: StockGroupTreeItem) => {
      const name = await window.showInputBox({ prompt: 'Stock group name', value: item.groupName });
      if (!name?.trim()) return;
      const groups = config.getStockGroups(DEFAULT_STOCKS);
      if (!groups[item.groupIndex]) return;
      groups[item.groupIndex] = { ...groups[item.groupIndex], name: name.trim() } as StockWatchGroup;
      await config.setStockGroups(groups);
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.removeStockGroup', async (item: StockGroupTreeItem) => {
      const groups = config.getStockGroups(DEFAULT_STOCKS);
      const group = groups[item.groupIndex];
      if (!group) return;
      const answer = await window.showWarningMessage(
        `Remove group "${group.name}" and ${group.codes.length} watched stocks?`,
        { modal: true },
        'Remove'
      );
      if (answer !== 'Remove') return;
      await config.setStockGroups(groups.filter((_, index) => index !== item.groupIndex));
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.addStock', async (item?: StockGroupTreeItem) => {
      const groups = config.getStockGroups(DEFAULT_STOCKS);
      if (groups.length === 0) groups.push({ name: 'My Stocks', codes: [] });
      const groupIndex = item?.groupIndex ?? 0;
      const selected = await pickSearchResult(
        'Add Stock',
        'Type a stock code or name',
        (keyword) => stockGateway.search(keyword)
      );
      if (!selected) return;
      const group = groups[groupIndex];
      if (!group) return;
      const code = fromStockApiCode(selected.code);
      groups[groupIndex] = { ...group, codes: [...new Set([...group.codes, code])] };
      await config.setStockGroups(groups);
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.deleteStock', async (item: StockQuoteTreeItem) => {
      const groups = config.getStockGroups(DEFAULT_STOCKS);
      const group = groups[item.groupIndex];
      if (!group) return;
      groups[item.groupIndex] = { ...group, codes: group.codes.filter((code) => code !== item.code) };
      await config.setStockGroups(groups);
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.stockTop', async (item: StockQuoteTreeItem) => {
      await moveStock(config, item, 'top');
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.stockUp', async (item: StockQuoteTreeItem) => {
      await moveStock(config, item, 'up');
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.stockDown', async (item: StockQuoteTreeItem) => {
      await moveStock(config, item, 'down');
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.setStockPosition', async (item: StockQuoteTreeItem) => {
      const current = config.getStockPositions().get(item.code);
      const position = await promptStockPosition(item.code, current);
      if (!position) return;
      await config.setStockPosition(position);
      await stockRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.addStockReminder', async (item: StockQuoteTreeItem) => {
      const selected = await window.showQuickPick<QuickPickItem & {
        ruleKind: StockReminderRule['kind'];
        direction: StockReminderRule['direction'];
      }>([
        { label: 'Price rises above', ruleKind: 'price', direction: 'above' },
        { label: 'Price falls below', ruleKind: 'price', direction: 'below' },
        { label: 'Change rises above (%)', ruleKind: 'changeRatio', direction: 'above' },
        { label: 'Change falls below (%)', ruleKind: 'changeRatio', direction: 'below' },
      ], { placeHolder: 'Reminder type' });
      if (!selected) return;
      const thresholdInput = await promptPositiveNumber(
        selected.ruleKind === 'price' ? 'Price threshold' : 'Percentage threshold'
      );
      if (thresholdInput === undefined) return;
      const threshold = selected.ruleKind === 'price'
        ? thresholdInput
        : thresholdInput / 100 * (selected.direction === 'below' ? -1 : 1);
      await config.addStockReminder(item.code, {
        kind: selected.ruleKind,
        direction: selected.direction,
        threshold,
      });
      window.showInformationMessage(`Reminder added for ${item.label}`);
    }),
    commands.registerCommand('tickerdock.removeStockReminders', async (item: StockQuoteTreeItem) => {
      await config.removeStockReminders(item.code);
      window.showInformationMessage(`Reminders removed for ${item.label}`);
    }),
    commands.registerCommand('tickerdock.addFundGroup', async () => {
      const name = await window.showInputBox({ prompt: 'Fund group name', ignoreFocusOut: true });
      if (!name) return;
      const groups = config.getFundGroups(DEFAULT_FUNDS);
      await config.setFundGroups([...groups, { name, codes: [] }]);
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.renameFundGroup', async (item: FundGroupTreeItem) => {
      const name = await window.showInputBox({ prompt: 'Fund group name', value: item.groupName });
      if (!name) return;
      const groups = config.getFundGroups(DEFAULT_FUNDS);
      if (!groups[item.groupIndex]) return;
      groups[item.groupIndex] = { ...groups[item.groupIndex], name } as FundWatchGroup;
      await config.setFundGroups(groups);
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.removeFundGroup', async (item: FundGroupTreeItem) => {
      const groups = config.getFundGroups(DEFAULT_FUNDS);
      const group = groups[item.groupIndex];
      if (!group) return;
      const answer = await window.showWarningMessage(
        `Remove group "${group.name}" and ${group.codes.length} watched funds?`,
        { modal: true },
        'Remove'
      );
      if (answer !== 'Remove') return;
      await config.setFundGroups(groups.filter((_, index) => index !== item.groupIndex));
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.addFund', async (item?: FundGroupTreeItem) => {
      const groups = config.getFundGroups(DEFAULT_FUNDS);
      if (groups.length === 0) groups.push({ name: 'My Funds', codes: [] });
      const groupIndex = item?.groupIndex ?? 0;
      const selected = await pickSearchResult(
        'Add Fund',
        'Type a fund code or name',
        (keyword) => fundGateway.search(keyword)
      );
      if (!selected || !groups[groupIndex]) return;
      groups[groupIndex] = {
        ...groups[groupIndex],
        codes: [...new Set([...groups[groupIndex].codes, selected.code])],
      };
      await config.setFundGroups(groups);
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.deleteFund', async (item: FundQuoteTreeItem) => {
      const groups = config.getFundGroups(DEFAULT_FUNDS);
      const group = groups[item.groupIndex];
      if (!group) return;
      groups[item.groupIndex] = { ...group, codes: group.codes.filter((code) => code !== item.code) };
      await config.setFundGroups(groups);
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.fundTop', async (item: FundQuoteTreeItem) => {
      await moveFund(config, item, 'top');
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.fundUp', async (item: FundQuoteTreeItem) => {
      await moveFund(config, item, 'up');
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.fundDown', async (item: FundQuoteTreeItem) => {
      await moveFund(config, item, 'down');
      await fundRefresh.refreshNow();
    }),
    commands.registerCommand('tickerdock.setFundPosition', async (item: FundQuoteTreeItem) => {
      const current = config.getFundPositions().get(item.code);
      const position = await promptFundPosition(item.code, current);
      if (!position) return;
      await config.setFundPosition(position);
      await fundRefresh.refreshNow();
    })
  );
}

async function moveFund(
  config: ConfigRepository,
  item: FundQuoteTreeItem,
  direction: 'top' | 'up' | 'down'
): Promise<void> {
  const groups = config.getFundGroups(DEFAULT_FUNDS);
  const group = groups[item.groupIndex];
  if (!group) return;
  groups[item.groupIndex] = { ...group, codes: moveCode(group.codes, item.code, direction) };
  await config.setFundGroups(groups);
}

async function moveStock(
  config: ConfigRepository,
  item: StockQuoteTreeItem,
  direction: 'top' | 'up' | 'down'
): Promise<void> {
  const groups = config.getStockGroups(DEFAULT_STOCKS);
  const group = groups[item.groupIndex];
  if (!group) return;
  groups[item.groupIndex] = { ...group, codes: moveCode(group.codes, item.code, direction) };
  await config.setStockGroups(groups);
}

async function promptStockPosition(code: string, current?: StockPosition): Promise<StockPosition | undefined> {
  const quantity = await promptPositiveNumber('Position quantity', current?.quantity);
  if (quantity === undefined) return undefined;
  const costPrice = await promptPositiveNumber('Average cost price', current?.costPrice);
  if (costPrice === undefined) return undefined;
  const tradeText = await window.showInputBox({
    prompt: 'Today trade price (optional)',
    value: current?.todayTradePrice ? String(current.todayTradePrice) : '',
    validateInput: optionalPositiveNumberValidation,
  });
  if (tradeText === undefined) return undefined;
  const soldOut = await window.showQuickPick<QuickPickItem & { value: boolean }>([
    { label: 'Holding', value: false },
    { label: 'Sold out today', value: true },
  ], { placeHolder: 'Position status' });
  if (!soldOut) return undefined;
  return {
    code,
    quantity,
    costPrice,
    todayTradePrice: tradeText ? Number(tradeText) : undefined,
    soldOut: soldOut.value,
  };
}

async function promptFundPosition(code: string, current?: FundPosition): Promise<FundPosition | undefined> {
  const shares = await promptPositiveNumber('Fund shares', current?.shares);
  if (shares === undefined) return undefined;
  const costNav = await promptPositiveNumber('Average cost NAV', current?.costNav);
  return costNav === undefined ? undefined : { code, shares, costNav };
}

async function promptPositiveNumber(prompt: string, current?: number): Promise<number | undefined> {
  const value = await window.showInputBox({
    prompt,
    value: current ? String(current) : '',
    validateInput: (text) => positiveNumberValidation(text),
  });
  return value === undefined ? undefined : Number(value);
}

function positiveNumberValidation(value: string): string | undefined {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? undefined : 'Enter a number greater than zero';
}

function optionalPositiveNumberValidation(value: string): string | undefined {
  return value === '' ? undefined : positiveNumberValidation(value);
}

function treeItemLabel(item: { label?: string | { label: string } }): string {
  return typeof item.label === 'string' ? item.label : item.label?.label ?? '';
}

function isIndexStock(code: string, name: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (normalized.startsWith('HF')) return false;
  return ['USDJI', 'USIXIC', 'USINX', '0DJI', '0IXIC', '0INX'].includes(normalized) || /\u6307\u6570/.test(name);
}

export function deactivate(): void {
  // VS Code disposes all resources registered in context.subscriptions.
}
