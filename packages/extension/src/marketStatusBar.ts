import { Disposable, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { StockQuote } from '@stock-fund/domain';
import { normalizeStatusBarCodes } from './statusBarModel';
import {
  changeIcon,
  DEFAULT_PERSONALIZATION,
  PersonalizationConfig,
  renderTemplate,
} from './personalizationModel';
import { formatQuotePrice, formatStockQuoteTooltip } from './quoteFormat';

export interface MarketStatusBarOptions {
  visible: boolean;
  showIcons: boolean;
  codes: readonly string[];
  appearance?: PersonalizationConfig;
}

export class MarketStatusBar implements Disposable {
  private readonly items: StatusBarItem[] = [];
  private quotes = new Map<string, StockQuote>();
  private options: Required<MarketStatusBarOptions> = {
    visible: true,
    showIcons: true,
    codes: [],
    appearance: DEFAULT_PERSONALIZATION,
  };

  setOptions(options: MarketStatusBarOptions): void {
    this.options = {
      ...options,
      appearance: options.appearance ?? DEFAULT_PERSONALIZATION,
      codes: normalizeStatusBarCodes(options.codes, options.codes),
    };
    this.render();
  }

  updateQuotes(quotes: readonly StockQuote[]): void {
    this.quotes = new Map(quotes.map((quote) => [quote.code, quote]));
    this.render();
  }

  dispose(): void {
    this.items.splice(0).forEach((item) => item.dispose());
  }

  private render(): void {
    if (!this.options.visible) {
      this.items.forEach((item) => item.hide());
      return;
    }
    const quotes = this.options.codes.flatMap((code) => {
      const quote = this.quotes.get(code);
      return quote?.status === 'live' ? [quote] : [];
    });
    this.resize(quotes.length);
    quotes.forEach((quote, index) => this.renderQuote(this.items[index]!, quote));
  }

  private resize(size: number): void {
    while (this.items.length < size) {
      const item = window.createStatusBarItem(StatusBarAlignment.Left, 4);
      item.name = '股票行情';
      this.items.push(item);
    }
    this.items.forEach((item, index) => {
      if (index >= size) item.hide();
    });
  }

  private renderQuote(item: StatusBarItem, quote: StockQuote): void {
    const appearance = this.options.appearance;
    const icon = this.options.showIcons ? changeIcon(quote.changeRatio, appearance.changeIconStyle) : '';
    item.text = renderTemplate(appearance.statusBarLabelTemplate, {
      icon: icon ? `${icon} ` : '',
      name: quote.name,
      code: quote.code,
      price: formatQuotePrice(quote.price),
      percent: formatPercent(quote.changeRatio),
      change: formatSigned(quote.change),
    });
    item.color = appearance.useCustomStatusBarColors
      ? quote.changeRatio >= 0 ? appearance.riseColor : appearance.fallColor
      : undefined;
    item.tooltip = formatStockQuoteTooltip(quote);
    item.command = {
      title: '查看股票K线',
      command: 'stock-fund.viewStockHistoryByCode',
      arguments: [quote.code, quote.name],
    };
    item.show();
  }
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatQuotePrice(value)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}
