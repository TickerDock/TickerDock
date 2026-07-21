import { FundNav, FundQuote } from '@stock-fund/domain';
import { filterFundNavRange, FundTrendRange, trendSummary } from './trendModel';
import { chartCsp, chartElement, ChartResources, chartRuntime } from './chartPage';

export interface FundOverviewState {
  funds: readonly FundQuote[];
  selectedCode: string;
  history: readonly FundNav[];
  range: FundTrendRange;
  loading: boolean;
  error?: string;
}

const RANGES: readonly { id: FundTrendRange; label: string }[] = [
  { id: '1m', label: '1M' }, { id: '3m', label: '3M' }, { id: '6m', label: '6M' },
  { id: '1y', label: '1年' }, { id: 'all', label: '全部' },
];

export function renderFundOverviewPage(state: FundOverviewState, nonce: string, resources?: ChartResources): string {
  const selected = state.funds.find(({ code }) => code === state.selectedCode) ?? state.funds[0];
  const filtered = filterFundNavRange(state.history, state.range);
  const list = state.funds.map((fund) => fundListItem(fund, fund.code === selected?.code)).join('');
  const detail = selected ? renderDetail(selected, filtered, state) : '<div class="empty">暂无自选基金。</div>';
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'${chartCsp(resources)};"><style>${styles()}</style></head><body><main><aside><header><h1>基金走势</h1><input id="search" type="search" placeholder="搜索基金" aria-label="搜索基金"></header><div id="funds" class="funds">${list || '<div class="empty compact">暂无自选基金。</div>'}</div></aside><section class="detail">${detail}</section></main><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('[data-fund]').forEach((button)=>button.addEventListener('click',()=>vscode.postMessage({command:'selectFund',code:button.dataset.fund})));document.querySelectorAll('[data-range]').forEach((button)=>button.addEventListener('click',()=>vscode.postMessage({command:'changeRange',range:button.dataset.range})));const search=document.getElementById('search');search?.addEventListener('input',()=>{const keyword=search.value.trim().toLowerCase();document.querySelectorAll('[data-fund]').forEach((button)=>{button.hidden=keyword!==''&&!button.dataset.search.includes(keyword);});});</script>${chartRuntime(resources, nonce)}</body></html>`;
}

function fundListItem(fund: FundQuote, selected: boolean): string {
  const change = fund.estimatedChangeRatio ?? fund.navChangeRatio;
  const nav = fund.estimatedNav ?? fund.nav;
  const search = `${fund.code} ${fund.name}`.toLowerCase();
  return `<button class="fund${selected ? ' selected' : ''}" type="button" data-fund="${escapeHtml(fund.code)}" data-search="${escapeHtml(search)}"><span><strong>${escapeHtml(fund.name)}</strong><small>${escapeHtml(fund.code)}</small></span><span class="numbers"><b>${formatNav(nav)}</b><small class="${changeClass(change)}">${formatPercent(change)}</small></span></button>`;
}

function renderDetail(fund: FundQuote, history: readonly FundNav[], state: FundOverviewState): string {
  const change = fund.estimatedChangeRatio ?? fund.navChangeRatio;
  const buttons = RANGES.map(({ id, label }) => `<button type="button" data-range="${id}"${id === state.range ? ' aria-pressed="true"' : ''}>${label}</button>`).join('');
  const estimate = fund.estimatedNav === undefined ? '--' : formatNav(fund.estimatedNav);
  const estimateTime = fund.estimateTime ?? '--';
  const content = state.loading
    ? '<div class="empty">正在加载净值历史...</div>'
    : state.error
      ? `<div class="warning">${escapeHtml(state.error)}</div>`
      : history.length ? `${renderSummary(history)}${renderChart(history)}${renderTable(history)}` : '<div class="empty">暂无净值历史。</div>';
  return `<header class="detail-head"><div><h2>${escapeHtml(fund.name)}</h2><p>${escapeHtml(fund.code)} · ${fund.status === 'live' ? '实时行情' : '行情不可用'}</p></div><nav class="segments" aria-label="走势区间">${buttons}</nav></header><dl class="quote-summary"><div><dt>确认净值</dt><dd>${formatNav(fund.nav)}</dd><small>${escapeHtml(fund.navDate || '--')}</small></div><div><dt>估算净值</dt><dd>${estimate}</dd><small>${escapeHtml(estimateTime)}</small></div><div><dt>当前涨跌</dt><dd class="${changeClass(change)}">${formatPercent(change)}</dd><small>${fund.estimatedNav === undefined ? '已确认' : '估算'}</small></div><div><dt>累计净值</dt><dd>${formatNav(fund.accumulatedNav)}</dd><small>${escapeHtml(fund.source)}</small></div></dl>${content}`;
}

function renderSummary(data: readonly FundNav[]): string {
  const summary = trendSummary(data.map(({ nav }) => nav));
  if (!summary) return '';
  return `<dl class="period-summary"><div><dt>区间收益</dt><dd class="${changeClass(summary.changeRatio)}">${formatPercent(summary.changeRatio)}</dd></div><div><dt>最高</dt><dd>${formatNav(summary.high)}</dd></div><div><dt>最低</dt><dd>${formatNav(summary.low)}</dd></div><div><dt>样本数</dt><dd>${data.length}</dd></div></dl>`;
}

function renderChart(data: readonly FundNav[]): string {
  const points = downsample([...data].sort((a, b) => a.date.localeCompare(b.date)), 500);
  return `<section class="chart-wrap">${chartElement('fund-overview-chart', {
    animation: false, tooltip: { trigger: 'axis' },
    legend: { data: ['单位净值', '累计净值'], top: 4 },
    grid: { left: 58, right: 24, top: 48, bottom: 64 },
    xAxis: { type: 'category', boundaryGap: false, data: points.map(({ date }) => date), axisLabel: { hideOverlap: true } },
    yAxis: { type: 'value', scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }],
    series: [
      { name: '单位净值', type: 'line', showSymbol: false, data: points.map(({ nav }) => nav) },
      { name: '累计净值', type: 'line', showSymbol: false, data: points.map(({ accumulatedNav }) => accumulatedNav) },
    ],
  }, '基金净值走势')}</section>`;
}

function renderTable(data: readonly FundNav[]): string {
  const rows = [...data].reverse().slice(0, 40).map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${formatNav(item.nav)}</td><td>${formatNav(item.accumulatedNav)}</td></tr>`).join('');
  return `<section class="table-wrap"><table><thead><tr><th>日期</th><th>单位净值</th><th>累计净值</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function downsample<T>(items: readonly T[], maximum: number): T[] {
  if (items.length <= maximum) return [...items];
  const step = (items.length - 1) / (maximum - 1);
  return Array.from({ length: maximum }, (_, index) => items[Math.round(index * step)]!);
}

function styles(): string {
  return `:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}main{display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr);min-height:100vh}aside{border-right:1px solid var(--vscode-panel-border);min-width:0}aside header{position:sticky;top:0;z-index:2;padding:16px;background:var(--vscode-sideBar-background);border-bottom:1px solid var(--vscode-panel-border)}h1,h2{margin:0;font-size:18px}input{width:100%;margin-top:12px;padding:7px 9px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border);outline:none}.funds{display:flex;flex-direction:column}.fund{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;min-height:58px;padding:9px 12px;border:0;border-bottom:1px solid var(--vscode-panel-border);border-radius:0;text-align:left;color:var(--vscode-foreground);background:transparent;cursor:pointer}.fund:hover{background:var(--vscode-list-hoverBackground)}.fund.selected{background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground)}.fund span{min-width:0}.fund strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fund small{display:block;margin-top:3px;color:var(--vscode-descriptionForeground)}.fund.selected small{color:inherit;opacity:.8}.numbers{text-align:right;font-variant-numeric:tabular-nums}.detail{min-width:0;padding:22px 28px 48px}.detail-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.detail-head p{margin:5px 0 0;color:var(--vscode-descriptionForeground)}.segments{display:flex;border:1px solid var(--vscode-panel-border)}.segments button{min-width:46px;padding:6px 9px;border:0;border-right:1px solid var(--vscode-panel-border);border-radius:0;color:var(--vscode-foreground);background:transparent;cursor:pointer}.segments button:last-child{border-right:0}.segments button[aria-pressed=true]{color:var(--vscode-button-foreground);background:var(--vscode-button-background)}.quote-summary,.period-summary{display:grid;margin:20px 0;border-top:1px solid var(--vscode-panel-border);border-bottom:1px solid var(--vscode-panel-border)}.quote-summary{grid-template-columns:repeat(4,minmax(110px,1fr))}.period-summary{grid-template-columns:repeat(4,minmax(100px,1fr))}.quote-summary div,.period-summary div{padding:11px 12px;border-right:1px solid var(--vscode-panel-border)}.quote-summary div:last-child,.period-summary div:last-child{border-right:0}dt{font-size:12px;color:var(--vscode-descriptionForeground)}dd{margin:5px 0 0;font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}.quote-summary small{display:block;margin-top:4px;color:var(--vscode-descriptionForeground)}.positive{color:var(--vscode-charts-red)!important}.negative{color:var(--vscode-charts-green)!important}.chart-wrap,.table-wrap{width:100%;overflow-x:auto}.echart{width:100%;height:390px;min-width:620px;border:1px solid var(--vscode-panel-border)}.chart-error{display:grid;place-items:center;color:var(--vscode-descriptionForeground)}table{width:100%;margin-top:18px;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:7px 10px;text-align:right;border-bottom:1px solid var(--vscode-panel-border)}th:first-child,td:first-child{text-align:left}.empty,.warning{padding:36px 0;color:var(--vscode-descriptionForeground)}.compact{padding:16px}@media(max-width:760px){main{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--vscode-panel-border)}.funds{max-height:240px;overflow-y:auto}.detail{padding:18px 14px 36px}.detail-head{align-items:flex-start;flex-direction:column}.segments{width:100%}.segments button{flex:1}.quote-summary,.period-summary{grid-template-columns:repeat(2,1fr)}.quote-summary div,.period-summary div{border-bottom:1px solid var(--vscode-panel-border)}.echart{height:330px}}`;
}

function formatNav(value: number): string { return Number.isFinite(value) && value > 0 ? value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : '--'; }
function formatPercent(value: number | undefined): string { return value === undefined ? '--' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function changeClass(value: number | undefined): string { return value === undefined ? '' : value >= 0 ? 'positive' : 'negative'; }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }
