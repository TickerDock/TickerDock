import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import type { Bootstrap } from './protocol';
import { FundPositionManagerPage } from './pages/FundPositionManagerPage';
import { SectorManagerPage } from './pages/SectorManagerPage';
import { StockPositionManagerPage } from './pages/StockPositionManagerPage';
import { PersonalizationPage } from './pages/PersonalizationPage';
import { AiSettingsPage } from './pages/AiSettingsPage';
import { StockResearchPage } from './pages/StockResearchPage';
import { FundDetailPage } from './pages/FundDetailPage';
import { FundFlowsPage } from './pages/FundFlowsPage';
import { FundHoldingsPage } from './pages/FundHoldingsPage';
import { FundRankingPage } from './pages/FundRankingPage';
import { StockExtendedDetailPage } from './pages/StockExtendedDetailPage';
import { MarketSentimentPage } from './pages/MarketSentimentPage';
import { FundComparisonPage } from './pages/FundComparisonPage';
import { FundOverviewPage } from './pages/FundOverviewPage';
import { FundTrendPage } from './pages/FundTrendPage';
import { StockKlinePage } from './pages/StockKlinePage';
import { StockMarketFramePage } from './pages/StockMarketFramePage';
import { BinanceFramePage } from './pages/BinanceFramePage';
import { LeekCenterPage } from './pages/LeekCenterPage';

const AiResultPage = lazy(() => import('./pages/AiResultPage').then(({ AiResultPage: page }) => ({ default: page })));

export function App({ bootstrap }: { bootstrap: Bootstrap }): ReactElement {
  switch (bootstrap.page) {
    case 'sectorManager':
      return <SectorManagerPage initial={bootstrap.sectors} />;
    case 'stockPositions':
      return <StockPositionManagerPage items={bootstrap.items} initial={bootstrap.positions} />;
    case 'fundPositions':
      return <FundPositionManagerPage items={bootstrap.items} initial={bootstrap.positions} />;
    case 'personalization':
      return <PersonalizationPage initial={bootstrap.state} defaults={bootstrap.defaults} />;
    case 'aiSettings':
      return <AiSettingsPage initial={bootstrap.state} />;
    case 'stockResearch':
      return <StockResearchPage name={bootstrap.name} items={bootstrap.items} />;
    case 'fundDetail':
      return <FundDetailPage title={bootstrap.title} detail={bootstrap.detail} error={bootstrap.error} />;
    case 'fundHoldings':
      return <FundHoldingsPage name={bootstrap.name} items={bootstrap.items} error={bootstrap.error} />;
    case 'fundRanking':
      return <FundRankingPage items={bootstrap.items} error={bootstrap.error} />;
    case 'fundFlows':
      return <FundFlowsPage industry={bootstrap.industry} concept={bootstrap.concept} region={bootstrap.region} error={bootstrap.error} />;
    case 'stockExtendedDetail':
      return <StockExtendedDetailPage title={bootstrap.title} detail={bootstrap.detail} error={bootstrap.error} />;
    case 'marketSentiment':
      return <MarketSentimentPage initialSnapshot={bootstrap.snapshot} initialLoadingSections={bootstrap.loadingSections} error={bootstrap.error} />;
    case 'fundComparison':
      return <FundComparisonPage series={bootstrap.series} failedCodes={bootstrap.failedCodes} controls={bootstrap.controls} active={bootstrap.active} error={bootstrap.error} />;
    case 'fundOverview':
      return <FundOverviewPage funds={bootstrap.funds} selectedCode={bootstrap.selectedCode} history={bootstrap.history} range={bootstrap.range} loading={bootstrap.loading} error={bootstrap.error} />;
    case 'fundTrend':
      return <FundTrendPage title={bootstrap.title} data={bootstrap.data} controls={bootstrap.controls} active={bootstrap.active} error={bootstrap.error} />;
    case 'stockKline':
      return <StockKlinePage title={bootstrap.title} code={bootstrap.code} data={bootstrap.data} controls={bootstrap.controls} active={bootstrap.active} error={bootstrap.error} />;
    case 'stockMarketFrame':
      return <StockMarketFramePage title={bootstrap.title} targets={bootstrap.targets} mode={bootstrap.mode} error={bootstrap.error} />;
    case 'binanceFrame':
      return <BinanceFramePage title={bootstrap.title} source={bootstrap.source} />;
    case 'aiResult':
      return <Suspense fallback={<main className="ai-result-page"><p>正在加载 AI 结果...</p></main>}><AiResultPage title={bootstrap.title} result={bootstrap.result} /></Suspense>;
    case 'leekCenter':
      return <LeekCenterPage pages={bootstrap.pages} initialPageId={bootstrap.initialPageId} initialWatchlist={bootstrap.watchlist} />;
  }
}
