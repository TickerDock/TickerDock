import { Kline, StockIwenCaiInsights, StockQuote, StockResearchItem, StockTechnicalLevels } from '@stock-fund/domain';

export function buildStockExtendedDetail(
  quote: StockQuote,
  klines: readonly Kline[],
  research: readonly StockResearchItem[],
  unavailableSources: readonly string[] = [],
  iwencai?: StockIwenCaiInsights
) {
  const ordered = [...klines].sort((a, b) => a.date.localeCompare(b.date));
  const recent = ordered.slice(-20);
  const longer = ordered.slice(-60);
  const technical: StockTechnicalLevels = {
    currentPrice: quote.price,
    movingAverage20: average(recent.map(({ close }) => close)),
    movingAverage60: average(longer.map(({ close }) => close)),
    support: recent.length ? Math.min(...recent.map(({ low }) => low)) : undefined,
    resistance: recent.length ? Math.max(...recent.map(({ high }) => high)) : undefined,
    takeProfit: recent.length ? Math.max(...recent.map(({ high }) => high)) : undefined,
    stopLoss: recent.length ? Math.min(...recent.map(({ low }) => low)) : undefined,
    sampleSize: ordered.length,
  };
  return { code: quote.code, name: quote.name, changeRatio: quote.changeRatio, technical, ...(iwencai ? { iwencai } : {}), research: [...research], unavailableSources: [...unavailableSources] };
}

function average(values: readonly number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
