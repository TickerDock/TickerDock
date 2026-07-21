import { FundExtendedDetail, FundInstitutionRating, FundPeriodReturns, FundProfitProbability } from '@stock-fund/domain';

const RETURN_PERIODS: ReadonlyArray<[keyof FundPeriodReturns, string]> = [
  ['week', '1W'], ['month', '1M'], ['threeMonth', '3M'], ['sixMonth', '6M'],
  ['year', '1年'], ['threeYear', '3年'], ['yearToDate', '今年以来'], ['sinceInception', '成立以来'],
];

const PROBABILITY_PERIODS: ReadonlyArray<[keyof FundProfitProbability, string]> = [
  ['week', '持有7天'], ['month', '持有1个月'], ['threeMonth', '持有3个月'],
  ['sixMonth', '持有6个月'], ['year', '持有1年'],
];

export function renderFundDetailPage(detail: FundExtendedDetail): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-editor-background)}main{max-width:1280px;margin:0 auto;padding:24px 28px 48px}header{padding-bottom:20px;border-bottom:1px solid var(--vscode-panel-border)}h1{margin:0;font-size:22px;font-weight:600}header p{margin:6px 0 0;color:var(--vscode-descriptionForeground)}section{padding:22px 0;border-bottom:1px solid var(--vscode-panel-border)}h2{margin:0 0 14px;font-size:15px}.facts,.metrics{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:1px;background:var(--vscode-panel-border)}.fact,.metric{min-height:70px;padding:12px;background:var(--vscode-editor-background)}.label{display:block;margin-bottom:6px;color:var(--vscode-descriptionForeground);font-size:12px}.value{font-variant-numeric:tabular-nums}.metric .value{font-size:17px}.up{color:var(--vscode-charts-red)}.down{color:var(--vscode-charts-green)}.scores{display:grid;grid-template-columns:repeat(2,minmax(180px,280px));gap:24px;margin-bottom:18px}.score strong{font-size:24px;font-weight:500}.probability{display:grid;grid-template-columns:150px minmax(160px,1fr) 64px;gap:12px;align-items:center;margin:9px 0}.track{height:8px;background:var(--vscode-editorWidget-background)}.track i{display:block;height:100%;background:var(--vscode-charts-blue)}.probability output{text-align:right;font-variant-numeric:tabular-nums}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);text-align:right}th{color:var(--vscode-descriptionForeground);font-size:12px;font-weight:500}th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){text-align:left}.empty{color:var(--vscode-descriptionForeground)}@media(max-width:760px){main{padding:18px 14px 36px}.facts,.metrics{grid-template-columns:repeat(2,minmax(120px,1fr))}.scores{grid-template-columns:1fr}.probability{grid-template-columns:112px minmax(90px,1fr) 54px}.table-wrap{overflow-x:auto}table{min-width:680px}}
  </style></head><body><main><header><h1>${escapeHtml(detail.name)}</h1><p>${escapeHtml(detail.code)}${detail.fundType ? `  |  ${escapeHtml(detail.fundType)}` : ''}${detail.riskLevel ? `  |  ${escapeHtml(detail.riskLevel)}` : ''}</p></header>
  ${overview(detail)}${performance(detail.returns)}${diagnosis(detail)}${ratingSection(detail.institutionRatings)}${similarSection(detail)}${holdingsSection(detail)}</main></body></html>`;
}

function overview(detail: FundExtendedDetail): string {
  const facts: Array<[string, string]> = [
    ['基金规模', money(detail.sizeCny, detail.sizeDate)],
    ['基金经理', detail.manager || '--'],
    ['成立日期', detail.establishedDate || '--'],
    ['管理公司', detail.managementCompany || '--'],
    ['综合评级', detail.ratingStars === undefined ? '--' : `${detail.ratingStars} / 5`],
    ['跟踪标的', detail.trackingTarget || '--'],
    ['年化跟踪误差', optionalPercent(detail.annualTrackingErrorRatio)],
  ];
  return `<section><h2>基金概览</h2><div class="facts">${facts.map(([label, value]) => `<div class="fact"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`).join('')}</div></section>`;
}

function performance(returns: FundPeriodReturns): string {
  const available = RETURN_PERIODS.some(([key]) => returns[key] !== undefined);
  return `<section><h2>业绩表现</h2>${available ? `<div class="metrics">${RETURN_PERIODS.map(([key, label]) => `<div class="metric"><span class="label">${label}</span><span class="value ${ratioClass(returns[key])}">${optionalPercent(returns[key])}</span></div>`).join('')}</div>` : empty()}</section>`;
}

function diagnosis(detail: FundExtendedDetail): string {
  const probabilities = PROBABILITY_PERIODS.filter(([key]) => detail.profitProbability[key] !== undefined);
  const scores = detail.overallScore !== undefined || detail.fundScore !== undefined
    ? `<div class="scores"><div class="score"><span class="label">综合评分</span><strong>${optionalNumber(detail.overallScore, 2)}</strong></div><div class="score"><span class="label">基金评分</span><strong>${optionalNumber(detail.fundScore, 3)}</strong></div></div>`
    : '';
  return `<section><h2>盈利概率</h2>${scores}${probabilities.length ? probabilities.map(([key, label]) => {
    const value = detail.profitProbability[key]!;
    return `<div class="probability"><span>${label}</span><div class="track"><i style="width:${Math.max(0, Math.min(value * 100, 100)).toFixed(2)}%"></i></div><output>${percent(value)}</output></div>`;
  }).join('') : empty()}</section>`;
}

function ratingSection(items: readonly FundInstitutionRating[]): string {
  return `<section><h2>机构评级</h2>${items.length ? `<div class="table-wrap"><table><thead><tr><th>日期</th><th>招商证券</th><th>济安金信</th><th>上海证券</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${stars(item.merchantSecurities)}</td><td>${stars(item.jianFundEvaluation)}</td><td>${stars(item.shanghaiSecurities)}</td></tr>`).join('')}</tbody></table></div>` : empty()}</section>`;
}

function similarSection(detail: FundExtendedDetail): string {
  return `<section><h2>同类基金</h2>${detail.similarFunds.length ? `<div class="table-wrap"><table><thead><tr><th>基金</th><th>代码</th><th>区间</th><th>收益</th></tr></thead><tbody>${detail.similarFunds.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.period || '--')}</td><td class="${ratioClass(item.returnRatio)}">${optionalPercent(item.returnRatio)}</td></tr>`).join('')}</tbody></table></div>` : empty()}</section>`;
}

function holdingsSection(detail: FundExtendedDetail): string {
  const reportDate = detail.holdings[0]?.reportDate;
  return `<section><h2>主要持仓${reportDate ? ` (${escapeHtml(reportDate)})` : ''}</h2>${detail.holdings.length ? `<div class="table-wrap"><table><thead><tr><th>股票</th><th>代码</th><th>净值占比</th><th>持股数（万股）</th><th>市值（万元）</th></tr></thead><tbody>${detail.holdings.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.code)}</td><td>${percent(item.navRatio)}</td><td>${item.sharesWan.toFixed(2)}</td><td>${item.marketValueWan.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>` : empty()}</section>`;
}

function money(value: number | undefined, date: string | undefined): string {
  if (value === undefined) return '--';
  const amount = value >= 100_000_000 ? `${(value / 100_000_000).toFixed(2)} B CNY`
    : value >= 10_000 ? `${(value / 10_000).toFixed(2)} 10k CNY` : `${value.toFixed(2)} CNY`;
  return date ? `${amount} (${date})` : amount;
}

function stars(value: number | undefined): string { return value === undefined ? '--' : `${value} / 5`; }
function optionalNumber(value: number | undefined, digits: number): string { return value === undefined ? '--' : value.toFixed(digits); }
function percent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function optionalPercent(value: number | undefined): string { return value === undefined ? '--' : percent(value); }
function ratioClass(value: number | undefined): string { return value === undefined ? '' : value >= 0 ? 'up' : 'down'; }
function empty(): string { return '<div class="empty">暂无数据。</div>'; }
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
