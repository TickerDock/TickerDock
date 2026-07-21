import { Disposable, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { CnyFxRates, PortfolioSummary, PositionProfit, summarizePortfolio } from '@stock-fund/domain';
import { DEFAULT_PERSONALIZATION, PersonalizationConfig, renderTemplate } from './personalizationModel';

export class PortfolioStatusBar implements Disposable {
  private readonly stockItem: StatusBarItem;
  private readonly fundItem: StatusBarItem;
  private stockVisible = true;
  private fundVisible = true;
  private rates: CnyFxRates = { CNY: 1 };
  private stockProfits: readonly PositionProfit[] = [];
  private fundProfits: readonly PositionProfit[] = [];
  private appearance: PersonalizationConfig = DEFAULT_PERSONALIZATION;

  constructor() {
    this.stockItem = window.createStatusBarItem(StatusBarAlignment.Left, 3);
    this.fundItem = window.createStatusBarItem(StatusBarAlignment.Left, 2);
    this.stockItem.name = '股票持仓';
    this.fundItem.name = '基金持仓';
    this.stockItem.command = 'stock-fund.manageStockPositions';
    this.fundItem.command = 'stock-fund.manageFundPositions';
  }

  setVisibility(stockVisible: boolean, fundVisible: boolean): void {
    this.stockVisible = stockVisible;
    this.fundVisible = fundVisible;
    this.updateStocks(this.stockProfits);
    this.updateFunds(this.fundProfits);
  }

  setPersonalization(appearance: PersonalizationConfig): void {
    this.appearance = appearance;
    this.updateStocks(this.stockProfits);
    this.updateFunds(this.fundProfits);
  }

  updateStocks(profits: readonly PositionProfit[]): void {
    this.stockProfits = profits;
    this.update(
      this.stockItem, this.stockVisible, '股票', '$(graph) ',
      this.appearance.stockPortfolioTemplate, summarizePortfolio(profits, this.rates)
    );
  }

  updateFunds(profits: readonly PositionProfit[]): void {
    this.fundProfits = profits;
    this.update(
      this.fundItem, this.fundVisible, '基金', '$(pulse) ',
      this.appearance.fundPortfolioTemplate, summarizePortfolio(profits, this.rates)
    );
  }

  setFxRates(rates: CnyFxRates): void {
    this.rates = { CNY: 1, ...rates };
    this.updateStocks(this.stockProfits);
    this.updateFunds(this.fundProfits);
  }

  dispose(): void {
    this.stockItem.dispose();
    this.fundItem.dispose();
  }

  private update(
    item: StatusBarItem,
    visible: boolean,
    name: string,
    icon: string,
    template: string,
    summary: PortfolioSummary
  ): void {
    if (!visible) {
      item.hide();
      return;
    }
    if (summary.positions.length === 0 && summary.excludedCurrencies.length === 0) {
      item.text = `${icon}${name} --`;
      item.tooltip = `${name}暂无持仓，点击管理持仓。`;
      item.color = undefined;
      item.show();
      return;
    }
    const warning = summary.excludedCurrencies.length > 0 ? ' $(warning)' : '';
    item.text = summary.positions.length === 0
      ? `${icon}${name}汇率不可用${warning}`
      : renderTemplate(template, {
          icon,
          name,
          currency: 'CNY',
          marketValue: money(summary.marketValue),
          costBasis: money(summary.costBasis),
          totalProfit: signed(summary.totalProfit),
          totalPercent: percent(summary.totalReturnRatio),
          todayProfit: signed(summary.todayProfit),
          todayPercent: percent(summary.todayReturnRatio),
          earnings: signed(summary.totalProfit),
          percent: percent(summary.totalReturnRatio),
          change: signed(summary.todayProfit),
          warning,
        });
    item.tooltip = [
      `市值（CNY）：${summary.marketValue.toFixed(2)}`,
      `成本（CNY）：${summary.costBasis.toFixed(2)}`,
      `累计收益（CNY）：${signed(summary.totalProfit)}（${percent(summary.totalReturnRatio)}）`,
      `今日收益（CNY）：${signed(summary.todayProfit)}（${percent(summary.todayReturnRatio)}）`,
      summary.excludedCurrencies.length > 0
        ? `汇率可用前暂不计入：${summary.excludedCurrencies.join(', ')}`
        : '',
      '',
      ...summary.positions
        .slice()
        .sort((a, b) => b.todayProfit - a.todayProfit)
        .map((position) => `${position.name}：CNY ${signed(position.totalProfit)} | 今日 ${signed(position.todayProfit)}`),
    ].filter((line, index) => line !== '' || index === 5).join('\n');
    item.color = this.appearance.useCustomStatusBarColors
      ? summary.totalProfit >= 0 ? this.appearance.riseColor : this.appearance.fallColor
      : undefined;
    item.show();
  }
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function money(value: number): string {
  return value.toFixed(2);
}

function percent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}
