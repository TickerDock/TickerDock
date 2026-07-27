import { Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import {
  calculateFundProfit,
  calculateStockProfit,
  FundPosition,
  FundQuote,
  PositionProfit,
  StockPosition,
  StockQuote,
} from '@stock-fund/domain';
import { FundWatchGroup, StockWatchGroup } from './configRepository';
import {
  FundSortMode,
  nextFundAmountSortMode,
  nextFundChangeSortMode,
  nextSortMode,
  SortMode,
  sortByChange,
  sortFunds,
} from './sortModel';
import { heldPositionLabel } from './heldHighlightModel';
import {
  changeTextIcon,
  DEFAULT_PERSONALIZATION,
  PersonalizationConfig,
  quoteIconFile,
  renderTemplate,
} from './personalizationModel';
import { formatQuotePrice as formatPrice, formatStockQuoteTooltip } from './quoteFormat';

export class StockGroupTreeItem extends TreeItem {
  readonly kind = 'stockGroup' as const;

  constructor(
    public readonly groupIndex: number,
    public readonly groupName: string,
    count: number
  ) {
    super(groupName, TreeItemCollapsibleState.Expanded);
    this.id = `stock-group:${groupIndex}`;
    this.description = String(count);
    this.contextValue = 'stockGroup';
    this.iconPath = new ThemeIcon('folder');
  }
}

export class StockQuoteTreeItem extends TreeItem {
  readonly kind = 'stock' as const;
  readonly changeRatio: number;
  readonly name: string;
  private readonly displayLabel: string;

  constructor(
    public readonly code: string,
    public readonly groupIndex: number,
    quote: StockQuote,
    public readonly profit?: PositionProfit,
    heldHighlightEnabled = true,
    appearance: PersonalizationConfig = DEFAULT_PERSONALIZATION,
    iconRoot?: Uri
  ) {
    const name = quote.name || code;
    const inlineIcon = changeTextIcon(quote.changeRatio, appearance.changeIconStyle);
    const displayLabel = appearance.sidebarDisplayMode === 'template' && quote.status === 'live'
      ? renderTemplate(appearance.stockLabelTemplate, {
          icon: inlineIcon,
          name,
          code,
          price: formatPrice(quote.price),
          percent: formatPercent(quote.changeRatio),
          change: formatMoney(quote.change),
          earnings: profit ? formatMoney(profit.totalProfit) : '',
        })
      : quote.status === 'live' && inlineIcon ? `${inlineIcon} ${name}` : name;
    super(heldPositionLabel(displayLabel, profit !== undefined, heldHighlightEnabled), TreeItemCollapsibleState.None);
    this.displayLabel = displayLabel;
    this.name = name;
    this.changeRatio = quote.changeRatio;
    this.id = `stock:${groupIndex}:${code}`;
    this.contextValue = profit ? 'stockPositionQuote' : 'stockQuote';
    this.iconPath = treeIcon(quote.status, quote.changeRatio, appearance.changeIconStyle, iconRoot, 'graph-line');
    this.command = {
      title: '查看股票走势',
      command: 'stock-fund.viewStockHistory',
      arguments: [this],
    };
    if (quote.status === 'unavailable') {
      this.description = '暂无数据';
      this.tooltip = `暂无 ${code} 行情`;
      return;
    }
    this.description = appearance.sidebarDisplayMode === 'template'
      ? undefined
      : `${formatPrice(quote.price)}  ${formatPercent(quote.changeRatio)}`
        + (profit ? `  ${heldHighlightEnabled ? '持仓  ' : ''}收益 ${formatMoney(profit.totalProfit)} ${profit.currency}` : '');
    this.tooltip = formatStockQuoteTooltip(quote);
  }

  setHeldHighlight(enabled: boolean): void {
    this.label = heldPositionLabel(this.displayLabel, this.profit !== undefined, enabled);
    if (this.profit && typeof this.description === 'string') {
      this.description = this.description.replace(/  (?:持仓  )?收益 /, `  ${enabled ? '持仓  ' : ''}收益 `);
    }
  }
}

export class FundGroupTreeItem extends TreeItem {
  readonly kind = 'fundGroup' as const;

  constructor(public readonly groupIndex: number, public readonly groupName: string) {
    super(groupName, TreeItemCollapsibleState.Expanded);
    this.id = `fund-group:${groupIndex}`;
    this.contextValue = 'fundGroup';
    this.iconPath = new ThemeIcon('folder');
  }
}

export class FundQuoteTreeItem extends TreeItem {
  readonly kind = 'fund' as const;
  readonly changeRatio: number;
  readonly marketValue: number;
  readonly name: string;

  constructor(
    public readonly code: string,
    public readonly groupIndex: number,
    quote: FundQuote,
    public readonly profit?: PositionProfit,
    appearance: PersonalizationConfig = DEFAULT_PERSONALIZATION,
    iconRoot?: Uri
  ) {
    const name = quote.name || code;
    const displayedNav = quote.estimatedNav ?? quote.nav;
    const displayedChange = quote.estimatedChangeRatio ?? quote.navChangeRatio;
    const changeRatio = displayedChange ?? 0;
    const inlineIcon = changeTextIcon(changeRatio, appearance.changeIconStyle);
    const label = appearance.sidebarDisplayMode === 'template' && quote.status === 'live'
      ? renderTemplate(appearance.fundLabelTemplate, {
          icon: inlineIcon,
          name,
          code,
          nav: formatPrice(displayedNav),
          price: formatPrice(displayedNav),
          percent: formatOptionalPercent(displayedChange),
          earnings: profit ? formatMoney(profit.totalProfit) : '',
          time: quote.estimateTime ?? quote.navDate,
        })
      : quote.status === 'live' && inlineIcon ? `${inlineIcon} ${name}` : name;
    super(label, TreeItemCollapsibleState.None);
    this.name = name;
    this.changeRatio = changeRatio;
    this.marketValue = profit?.marketValue ?? 0;
    this.id = `fund:${groupIndex}:${code}`;
    this.contextValue = profit ? 'fundPositionQuote' : 'fundQuote';
    this.iconPath = treeIcon(quote.status, changeRatio, appearance.changeIconStyle, iconRoot, 'pulse');
    this.command = {
      title: '查看基金走势',
      command: 'stock-fund.viewFundHistory',
      arguments: [this],
    };
    if (quote.status === 'unavailable') {
      this.description = '暂无数据';
      this.tooltip = `暂无 ${code} 行情`;
      return;
    }
    this.description = appearance.sidebarDisplayMode === 'template'
      ? undefined
      : `${quote.estimatedNav ? '估算 ' : ''}${formatPrice(displayedNav)}  ${formatOptionalPercent(displayedChange)}`
        + (profit ? `  收益 ${formatMoney(profit.totalProfit)} CNY` : '');
    this.tooltip = [
      code,
      `净值：${formatPrice(quote.nav)}`,
      quote.estimatedNav ? `估算净值：${formatPrice(quote.estimatedNav)}（${quote.estimateTime}）` : '',
      `累计净值：${formatPrice(quote.accumulatedNav)}`,
      `净值日期：${quote.navDate}`,
      profit ? `市值：${formatMoney(profit.marketValue)}` : '',
      profit ? `累计收益：${formatMoney(profit.totalProfit)}（${formatPercent(profit.totalReturnRatio)}）` : '',
      profit ? `今日收益：${formatMoney(profit.todayProfit)}（${formatPercent(profit.todayReturnRatio)}）` : '',
      `来源：${quote.source}`,
    ].filter(Boolean).join('\n');
  }
}

export type StockTreeNode = StockGroupTreeItem | StockQuoteTreeItem;
export type FundTreeNode = FundGroupTreeItem | FundQuoteTreeItem;

export class StockQuoteProvider implements TreeDataProvider<StockTreeNode> {
  private readonly changed = new EventEmitter<StockTreeNode | undefined | null | void>();
  private groups: StockWatchGroup[] = [];
  private quotes = new Map<string, StockQuote>();
  private sortMode: SortMode;
  private heldHighlightEnabled: boolean;
  private appearance: PersonalizationConfig;
  private positions: ReadonlyMap<string, StockPosition> = new Map();
  private readonly iconRoot?: Uri;
  readonly onDidChangeTreeData: Event<StockTreeNode | undefined | null | void> = this.changed.event;

  constructor(
    initialSortMode: SortMode = 'original',
    heldHighlightEnabled = true,
    appearance: PersonalizationConfig = DEFAULT_PERSONALIZATION,
    iconRoot?: Uri
  ) {
    this.sortMode = initialSortMode;
    this.heldHighlightEnabled = heldHighlightEnabled;
    this.appearance = appearance;
    this.iconRoot = iconRoot;
  }

  setData(
    groups: readonly StockWatchGroup[],
    quotes: readonly StockQuote[],
    positions: ReadonlyMap<string, StockPosition>
  ): PositionProfit[] {
    this.groups = groups.map((group) => ({ name: group.name, codes: [...group.codes] }));
    this.quotes = new Map(quotes.map((quote) => [quote.code, quote]));
    this.positions = positions;
    const profits = quotes.flatMap((quote) => {
      const position = this.positions.get(quote.code);
      const profit = position ? calculateStockProfit(quote, position) : undefined;
      return profit ? [profit] : [];
    });
    this.changed.fire();
    return profits;
  }

  getTreeItem(element: StockTreeNode): TreeItem { return element; }

  getChildren(element?: StockTreeNode): StockTreeNode[] {
    if (!element) {
      return this.groups.map((group, index) => new StockGroupTreeItem(index, group.name, group.codes.length));
    }
    if (element.kind === 'stock') return [];
    const group = this.groups[element.groupIndex];
    if (!group) return [];
    const items = group.codes.map((code) => {
      const quote = this.quotes.get(code) ?? unavailableStock(code);
      const position = this.positions.get(code);
      const profit = position ? calculateStockProfit(quote, position) : undefined;
      return new StockQuoteTreeItem(
        code, element.groupIndex, quote, profit, this.heldHighlightEnabled, this.appearance, this.iconRoot
      );
    });
    return sortByChange(items, this.sortMode);
  }

  cycleSort(): SortMode {
    this.sortMode = nextSortMode(this.sortMode);
    this.changed.fire();
    return this.sortMode;
  }

  setSortMode(mode: SortMode): void {
    this.sortMode = mode;
    this.changed.fire();
  }

  setHeldHighlightEnabled(enabled: boolean): void {
    this.heldHighlightEnabled = enabled;
    this.changed.fire();
  }

  setPersonalization(appearance: PersonalizationConfig): void {
    this.appearance = appearance;
    this.changed.fire();
  }

  getWatchItems(): Array<{ code: string; name: string }> {
    const seen = new Set<string>();
    return this.groups.flatMap(({ codes }) => codes).flatMap((code) => {
      if (seen.has(code)) return [];
      seen.add(code);
      return [{ code, name: this.quotes.get(code)?.name || code }];
    });
  }

  getWatchlistGroups(): Array<{ name: string; items: StockQuote[] }> {
    return this.groups.map((group) => ({
      name: group.name,
      items: group.codes.map((code) => this.quotes.get(code) ?? unavailableStock(code)),
    }));
  }
}

export class FundQuoteProvider implements TreeDataProvider<FundTreeNode> {
  private readonly changed = new EventEmitter<FundTreeNode | undefined | null | void>();
  private groups: FundWatchGroup[] = [];
  private quotes = new Map<string, FundQuote>();
  private positions: ReadonlyMap<string, FundPosition> = new Map();
  private sortMode: FundSortMode;
  private appearance: PersonalizationConfig;
  private readonly iconRoot?: Uri;
  readonly onDidChangeTreeData: Event<FundTreeNode | undefined | null | void> = this.changed.event;

  constructor(
    initialSortMode: FundSortMode = 'original',
    appearance: PersonalizationConfig = DEFAULT_PERSONALIZATION,
    iconRoot?: Uri
  ) {
    this.sortMode = initialSortMode;
    this.appearance = appearance;
    this.iconRoot = iconRoot;
  }

  setData(
    groups: readonly FundWatchGroup[],
    quotes: readonly FundQuote[],
    positions: ReadonlyMap<string, FundPosition>
  ): PositionProfit[] {
    this.groups = groups.map((group) => ({ name: group.name, codes: [...group.codes] }));
    this.quotes = new Map(quotes.map((quote) => [quote.code, quote]));
    this.positions = positions;
    const profits = quotes.flatMap((quote) => {
      const position = positions.get(quote.code);
      const profit = position ? calculateFundProfit(quote, position) : undefined;
      return profit ? [profit] : [];
    });
    this.changed.fire();
    return profits;
  }

  getTreeItem(element: FundTreeNode): TreeItem { return element; }

  getChildren(element?: FundTreeNode): FundTreeNode[] {
    if (!element) {
      return this.groups.map((group, index) => new FundGroupTreeItem(index, group.name));
    }
    if (element.kind === 'fund') return [];
    const group = this.groups[element.groupIndex];
    if (!group) return [];
    const items = group.codes.map((code) => {
      const quote = this.quotes.get(code) ?? unavailableFund(code);
      const position = this.positions.get(code);
      const profit = position ? calculateFundProfit(quote, position) : undefined;
      return new FundQuoteTreeItem(code, element.groupIndex, quote, profit, this.appearance, this.iconRoot);
    });
    return sortFunds(items, this.sortMode);
  }

  cycleSort(): FundSortMode {
    this.sortMode = nextFundChangeSortMode(this.sortMode);
    this.changed.fire();
    return this.sortMode;
  }

  cycleAmountSort(): FundSortMode {
    this.sortMode = nextFundAmountSortMode(this.sortMode);
    this.changed.fire();
    return this.sortMode;
  }

  setSortMode(mode: FundSortMode): void {
    this.sortMode = mode;
    this.changed.fire();
  }

  setPersonalization(appearance: PersonalizationConfig): void {
    this.appearance = appearance;
    this.changed.fire();
  }

  getWatchItems(): Array<{ code: string; name: string }> {
    const seen = new Set<string>();
    return this.groups.flatMap(({ codes }) => codes).flatMap((code) => {
      if (seen.has(code)) return [];
      seen.add(code);
      return [{ code, name: this.quotes.get(code)?.name || code }];
    });
  }

  getWatchlistGroups(): Array<{ name: string; items: FundQuote[] }> {
    return this.groups.map((group) => ({
      name: group.name,
      items: group.codes.map((code) => this.quotes.get(code) ?? unavailableFund(code)),
    }));
  }
}

function unavailableFund(code: string): FundQuote {
  return {
    code, name: code, nav: 0, accumulatedNav: 0, navDate: '',
    source: 'fund-api', status: 'unavailable',
  };
}

function unavailableStock(code: string): StockQuote {
  const normalized = code.toUpperCase();
  const market: StockQuote['market'] = normalized.startsWith('SH') ? 'sh'
    : normalized.startsWith('SZ') ? 'sz'
      : normalized.startsWith('HK') ? 'hk'
        : normalized.startsWith('HF') ? 'global-future'
          : 'us';
  return {
    code, name: code, market, price: 0, previousClose: 0, high: 0, low: 0,
    change: 0, changeRatio: 0, source: 'stock-api', status: 'unavailable',
  };
}

function formatMoney(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function formatOptionalPercent(value: number | undefined): string {
  return value === undefined ? '--' : formatPercent(value);
}

function treeIcon(
  status: StockQuote['status'] | FundQuote['status'],
  ratio: number,
  style: PersonalizationConfig['changeIconStyle'],
  iconRoot: Uri | undefined,
  fallback: string
): ThemeIcon | Uri | undefined {
  if (status !== 'live') return new ThemeIcon('warning');
  if (style === 'none') return undefined;
  if (!style.startsWith('arrow')) return undefined;
  const file = quoteIconFile(ratio, style);
  void fallback;
  return iconRoot && file
    ? Uri.joinPath(iconRoot, 'resources', 'quote-icons', file)
    : new ThemeIcon(ratio >= 0 ? 'arrow-up' : 'arrow-down');
}
