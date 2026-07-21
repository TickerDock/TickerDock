import { ViewColumn, WebviewPanel, window } from 'vscode';
import { FundFlowItem, FundHolding, FundInsightsGateway, FundRankItem } from '@stock-fund/domain';
import { renderFundDetailPage } from './fundDetailPage';

let detailPanel: WebviewPanel | undefined;
let detailRequestVersion = 0;

export async function showFundDetails(
  gateway: FundInsightsGateway,
  code: string,
  name = code
): Promise<void> {
  const title = `${name} 基金详情`;
  const panel = acquireDetailPanel(title);
  const version = ++detailRequestVersion;
  panel.webview.html = page('正在加载基金详情', '<div class="empty">正在加载数据...</div>');
  try {
    const detail = await gateway.getDetail(code);
    if (detailPanel === panel && version === detailRequestVersion) {
      panel.webview.html = renderFundDetailPage(detail);
    }
  } catch (error) {
    if (detailPanel === panel && version === detailRequestVersion) panel.webview.html = errorPage(error);
  }
}

export async function showFundHoldings(gateway: FundInsightsGateway, code: string): Promise<void> {
  const panel = createPanel(`基金持仓：${code}`);
  try {
    const holdings = await gateway.getHoldings(code);
    panel.webview.html = page(`${code} 主要持仓`, holdingsTable(holdings));
  } catch (error) {
    panel.webview.html = errorPage(error);
  }
}

export async function showFundRanking(gateway: FundInsightsGateway): Promise<void> {
  const panel = createPanel('基金排行');
  try {
    const ranking = await gateway.getRanking(40);
    panel.webview.html = page('基金日收益排行', rankingTable(ranking));
  } catch (error) {
    panel.webview.html = errorPage(error);
  }
}

export async function showFundFlows(gateway: FundInsightsGateway): Promise<void> {
  const panel = createPanel('市场资金流');
  try {
    const [industry, concept, region] = await Promise.all([
      gateway.getFlows('industry', 20),
      gateway.getFlows('concept', 20),
      gateway.getFlows('region', 20),
    ]);
    panel.webview.html = page('市场净流入', [
      flowSection('行业', industry),
      flowSection('概念', concept),
      flowSection('地区', region),
    ].join(''));
  } catch (error) {
    panel.webview.html = errorPage(error);
  }
}

function createPanel(title: string) {
  const panel = window.createWebviewPanel('stockFundInsights', title, ViewColumn.One, {
    enableScripts: false,
    retainContextWhenHidden: false,
  });
  panel.webview.html = page('正在加载', '<div class="empty">正在加载数据...</div>');
  return panel;
}

function acquireDetailPanel(title: string): WebviewPanel {
  if (detailPanel) {
    detailPanel.title = title;
    detailPanel.reveal(ViewColumn.One);
    return detailPanel;
  }
  const panel = window.createWebviewPanel('stockFundExtendedFundDetail', title, ViewColumn.One, {
    enableScripts: false,
    retainContextWhenHidden: false,
  });
  detailPanel = panel;
  panel.onDidDispose(() => {
    if (detailPanel !== panel) return;
    detailPanel = undefined;
    detailRequestVersion += 1;
  });
  return panel;
}

function holdingsTable(items: readonly FundHolding[]): string {
  if (!items.length) return empty();
  return `<p class="meta">报告日期：${escapeHtml(items[0]!.reportDate)}</p><table><thead><tr><th>#</th><th>代码</th><th>名称</th><th>净值占比</th><th>持股数（万股）</th><th>市值（万元）</th></tr></thead><tbody>${items.map((item, index) =>
    `<tr><td>${index + 1}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.name)}</td><td>${percent(item.navRatio)}</td><td>${item.sharesWan.toFixed(2)}</td><td>${item.marketValueWan.toFixed(2)}</td></tr>`
  ).join('')}</tbody></table>`;
}

function rankingTable(items: readonly FundRankItem[]): string {
  if (!items.length) return empty();
  return `<table><thead><tr><th>#</th><th>代码</th><th>名称</th><th>净值</th><th>日</th><th>周</th><th>月</th><th>3月</th><th>6月</th><th>1年</th><th>今年以来</th></tr></thead><tbody>${items.map((item, index) =>
    `<tr><td>${index + 1}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.name)}</td><td>${item.nav}</td><td>${percent(item.dayReturnRatio)}</td><td>${optionalPercent(item.weekReturnRatio)}</td><td>${optionalPercent(item.monthReturnRatio)}</td><td>${optionalPercent(item.threeMonthReturnRatio)}</td><td>${optionalPercent(item.sixMonthReturnRatio)}</td><td>${optionalPercent(item.yearReturnRatio)}</td><td>${optionalPercent(item.yearToDateReturnRatio)}</td></tr>`
  ).join('')}</tbody></table>`;
}

function flowSection(title: string, items: readonly FundFlowItem[]): string {
  const max = Math.max(...items.map((item) => Math.abs(item.netInflow)), 1);
  return `<section><h2>${escapeHtml(title)}</h2>${items.length ? items.map((item) => {
    const width = Math.max(1, Math.abs(item.netInflow) / max * 100);
    return `<div class="flow"><span>${escapeHtml(item.name)}</span><div class="track"><i class="${item.netInflow >= 0 ? 'up' : 'down'}" style="width:${width.toFixed(1)}%"></i></div><strong>${(item.netInflow / 100000000).toFixed(2)} B CNY</strong></div>`;
  }).join('') : empty()}</section>`;
}

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    :root{color-scheme:light dark}body{padding:20px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}h1{font-size:20px}h2{font-size:16px;margin-top:28px}.meta,.empty{color:var(--vscode-descriptionForeground)}
    table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{text-align:right;padding:7px 9px;border-bottom:1px solid var(--vscode-panel-border)}th:nth-child(2),td:nth-child(2),th:nth-child(3),td:nth-child(3){text-align:left}th{position:sticky;top:0;background:var(--vscode-editor-background)}
    .flow{display:grid;grid-template-columns:minmax(100px,180px) minmax(160px,1fr) 100px;gap:12px;align-items:center;margin:7px 0}.track{height:10px;background:var(--vscode-editorWidget-background)}.track i{display:block;height:100%}.up{background:var(--vscode-charts-red)}.down{background:var(--vscode-charts-green)}.flow strong{text-align:right;font-size:12px}
  </style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

function errorPage(error: unknown): string {
  return page('数据不可用', `<div class="empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`);
}

function empty(): string { return '<div class="empty">暂无数据。</div>'; }
function percent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function optionalPercent(value: number | undefined): string { return value === undefined ? '--' : percent(value); }
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
