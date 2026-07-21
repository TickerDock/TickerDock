import type { StockQuote } from '@stock-fund/domain';

export function formatQuotePrice(value: number): string {
  return Number.isFinite(value)
    ? value.toFixed(value >= 100 ? 2 : 4).replace(/0+$/, '').replace(/\.$/, '')
    : '--';
}

export function formatStockQuoteTooltip(quote: StockQuote): string {
  return [
    `${quote.name} (${quote.code})`,
    `现价：${formatQuotePrice(quote.price)}`,
    `涨跌：${formatSignedPrice(quote.change)}（${formatSignedPercent(quote.changeRatio)}）`,
    `开盘：${formatOptionalPrice(quote.open)}`,
    `最高/最低：${formatQuotePrice(quote.high)} / ${formatQuotePrice(quote.low)}`,
    `昨收：${formatQuotePrice(quote.previousClose)}`,
    `来源：${quote.source}`,
  ].join('\n');
}

function formatOptionalPrice(value: number | undefined): string {
  return value === undefined ? '--' : formatQuotePrice(value);
}

function formatSignedPrice(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatQuotePrice(value)}`;
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}
