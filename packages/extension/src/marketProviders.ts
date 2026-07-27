import { Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { CryptoQuote, ForexQuote } from '@tickerdock/domain';
import { nextSortMode, SortMode, sortByChange } from './sortModel';

export class CryptoTreeItem extends TreeItem {
  readonly changeRatio: number;

  constructor(public readonly symbol: string, quote: CryptoQuote) {
    super(`${quote.baseAsset} / ${quote.quoteAsset}`, TreeItemCollapsibleState.None);
    this.id = `crypto:${symbol}`;
    this.changeRatio = quote.changeRatio;
    this.contextValue = 'cryptoQuote';
    this.iconPath = new ThemeIcon(quote.status === 'live' ? 'symbol-currency' : 'warning');
    this.description = quote.status === 'live'
      ? `${formatPrice(quote.price)}  ${formatPercent(quote.changeRatio)}`
      : 'No data';
    this.tooltip = quote.status === 'live'
      ? `${symbol}\nPrice: ${quote.price}\n24h high / low: ${quote.high} / ${quote.low}\n24h volume: ${quote.volume}\nQuote volume: ${quote.quoteVolume}`
      : `No quote returned for ${symbol}`;
    this.command = {
      title: 'View Binance details',
      command: 'tickerdock.viewBinanceHistory',
      arguments: [this],
    };
  }
}

export class ForexTreeItem extends TreeItem {
  constructor(quote: ForexQuote) {
    super(quote.name, TreeItemCollapsibleState.None);
    this.id = `forex:${quote.name}`;
    this.contextValue = 'forexQuote';
    this.iconPath = new ThemeIcon('globe');
    this.description = quote.conversionPrice === undefined ? '--' : String(quote.conversionPrice);
    this.tooltip = [
      `Spot buy / sell: ${value(quote.spotBuyPrice)} / ${value(quote.spotSellPrice)}`,
      `Cash buy / sell: ${value(quote.cashBuyPrice)} / ${value(quote.cashSellPrice)}`,
      `Conversion price: ${value(quote.conversionPrice)}`,
      `Published: ${quote.publishDate} ${quote.publishTime}`,
    ].join('\n');
  }
}

export class CryptoProvider implements TreeDataProvider<CryptoTreeItem> {
  private readonly changed = new EventEmitter<void>();
  private items: CryptoTreeItem[] = [];
  private sortMode: SortMode;
  readonly onDidChangeTreeData: Event<void> = this.changed.event;

  constructor(initialSortMode: SortMode = 'original') {
    this.sortMode = initialSortMode;
  }

  setQuotes(quotes: readonly CryptoQuote[]): void {
    this.items = quotes.map((quote) => new CryptoTreeItem(quote.symbol, quote));
    this.changed.fire();
  }

  getTreeItem(item: CryptoTreeItem): TreeItem { return item; }
  getChildren(): CryptoTreeItem[] { return sortByChange(this.items, this.sortMode); }

  cycleSort(): SortMode {
    this.sortMode = nextSortMode(this.sortMode);
    this.changed.fire();
    return this.sortMode;
  }

  setSortMode(mode: SortMode): void {
    this.sortMode = mode;
    this.changed.fire();
  }
}

export class ForexProvider implements TreeDataProvider<ForexTreeItem> {
  private readonly changed = new EventEmitter<void>();
  private items: ForexTreeItem[] = [];
  readonly onDidChangeTreeData: Event<void> = this.changed.event;

  setQuotes(quotes: readonly ForexQuote[]): void {
    const priority = ['美元', 'USD', '欧元', 'EUR', '英镑', 'GBP', '港币', 'HKD', '日元', 'JPY'];
    this.items = quotes
      .map((quote) => new ForexTreeItem(quote))
      .sort((a, b) => priorityIndex(a.label, priority) - priorityIndex(b.label, priority));
    this.changed.fire();
  }

  getTreeItem(item: ForexTreeItem): TreeItem { return item; }
  getChildren(): ForexTreeItem[] { return this.items; }
}

function formatPrice(price: number): string {
  return price >= 100 ? price.toFixed(2) : price.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function formatPercent(ratio: number): string {
  return `${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(2)}%`;
}

function value(input: number | undefined): string { return input === undefined ? '--' : String(input); }

function priorityIndex(label: string | { label: string } | undefined, priority: string[]): number {
  const value = typeof label === 'string' ? label : label?.label ?? '';
  const index = priority.findIndex((item) => value.toUpperCase().includes(item));
  return index < 0 ? priority.length : index;
}
