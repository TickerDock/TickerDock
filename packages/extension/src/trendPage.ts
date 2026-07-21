import { FundNav, Kline } from '@stock-fund/domain';
import { trendSummary } from './trendModel';
import { chartCsp, chartElement, ChartResources, chartRuntime } from './chartPage';

export interface TrendControl {
  id: string;
  label: string;
}

export function renderCandleTrendPage(
  title: string,
  data: readonly Kline[],
  controls: readonly TrendControl[],
  activeControl: string,
  nonce: string
): string {
  const ordered = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const content = ordered.length === 0
    ? '<div class="empty">暂无走势数据。</div>'
    : `${renderSummary(ordered.map(({ close }) => close))}${renderCandles(ordered)}${renderKlineTable(ordered)}`;
  return page(title, controls, activeControl, nonce, content);
}

export function renderFundTrendPage(
  title: string,
  data: readonly FundNav[],
  controls: readonly TrendControl[],
  activeControl: string,
  nonce: string,
  resources?: ChartResources
): string {
  const ordered = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const content = ordered.length === 0
    ? '<div class="empty">暂无净值走势数据。</div>'
    : `${renderSummary(ordered.map(({ nav }) => nav))}${renderFundLines(ordered)}${renderFundTable(ordered)}`;
  return page(title, controls, activeControl, nonce, content, resources);
}

export function renderTrendLoading(title: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>${styles()}</style></head><body><main><h1>${escapeHtml(title)}</h1><div class="empty">正在加载走势数据...</div></main></body></html>`;
}

export function renderTrendError(title: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>${styles()}</style></head><body><main><h1>${escapeHtml(title)}</h1><div class="empty">${escapeHtml(message)}</div></main></body></html>`;
}

function renderCandles(data: readonly Kline[]): string {
  const width = 1000;
  const priceHeight = 300;
  const volumeTop = 330;
  const totalHeight = 430;
  const low = Math.min(...data.map((item) => item.low));
  const high = Math.max(...data.map((item) => item.high));
  const range = high - low || 1;
  const maxVolume = Math.max(...data.map((item) => item.volume ?? 0), 1);
  const step = width / data.length;
  const candleWidth = Math.max(2, Math.min(8, step * 0.65));
  const y = (value: number) => 12 + (high - value) / range * (priceHeight - 24);
  const marks = data.map((item, index) => {
    const x = step * index + step / 2;
    const openY = y(item.open);
    const closeY = y(item.close);
    const className = item.close >= item.open ? 'up' : 'down';
    const bodyY = Math.min(openY, closeY);
    const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
    const volumeHeight = (item.volume ?? 0) / maxVolume * 76;
    return `<line class="${className}" x1="${x.toFixed(2)}" y1="${y(item.high).toFixed(2)}" x2="${x.toFixed(2)}" y2="${y(item.low).toFixed(2)}"/><rect class="${className}" x="${(x - candleWidth / 2).toFixed(2)}" y="${bodyY.toFixed(2)}" width="${candleWidth.toFixed(2)}" height="${bodyHeight.toFixed(2)}"/><rect class="volume ${className}" x="${(x - candleWidth / 2).toFixed(2)}" y="${(volumeTop + 76 - volumeHeight).toFixed(2)}" width="${candleWidth.toFixed(2)}" height="${volumeHeight.toFixed(2)}"/>`;
  }).join('');
  return `<section class="chart-wrap"><div class="chart-meta"><span>${formatDate(data[0]!.date)}</span><span>${formatNumber(low)} - ${formatNumber(high)}</span><span>${formatDate(data.at(-1)!.date)}</span></div><svg class="chart" viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="OHLC candlestick chart"><line class="grid" x1="0" y1="${priceHeight / 2}" x2="${width}" y2="${priceHeight / 2}"/><line class="grid" x1="0" y1="${volumeTop - 10}" x2="${width}" y2="${volumeTop - 10}"/>${marks}</svg></section>`;
}

function renderFundLines(data: readonly FundNav[]): string {
  return `<section class="chart-wrap">${chartElement('fund-nav-chart', {
    animation: false,
    tooltip: { trigger: 'axis' },
    legend: { data: ['单位净值', '累计净值'], top: 4 },
    grid: { left: 58, right: 24, top: 48, bottom: 64 },
    xAxis: { type: 'category', boundaryGap: false, data: data.map(({ date }) => date), axisLabel: { hideOverlap: true } },
    yAxis: { type: 'value', scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }],
    series: [
      { name: '单位净值', type: 'line', showSymbol: false, sampling: 'lttb', data: data.map(({ nav }) => nav) },
      { name: '累计净值', type: 'line', showSymbol: false, sampling: 'lttb', data: data.map(({ accumulatedNav }) => accumulatedNav) },
    ],
  }, '基金净值走势')}</section>`;
}

function renderSummary(values: readonly number[]): string {
  const summary = trendSummary(values);
  if (!summary) return '';
  return `<dl class="summary"><div><dt>最新</dt><dd>${formatNumber(summary.latest)}</dd></div><div><dt>区间涨跌</dt><dd class="${summary.changeRatio >= 0 ? 'positive' : 'negative'}">${formatPercent(summary.changeRatio)}</dd></div><div><dt>最高</dt><dd>${formatNumber(summary.high)}</dd></div><div><dt>最低</dt><dd>${formatNumber(summary.low)}</dd></div><div><dt>样本数</dt><dd>${values.length}</dd></div></dl>`;
}

function renderKlineTable(data: readonly Kline[]): string {
  const rows = [...data].reverse().slice(0, 60).map((item) => `<tr><td>${escapeHtml(formatDate(item.date))}</td><td>${formatNumber(item.open)}</td><td>${formatNumber(item.close)}</td><td>${formatNumber(item.high)}</td><td>${formatNumber(item.low)}</td><td>${item.volume === undefined ? '--' : formatCompact(item.volume)}</td></tr>`).join('');
  return `<section class="table-wrap"><table><thead><tr><th>日期</th><th>开盘</th><th>收盘</th><th>最高</th><th>最低</th><th>成交量</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function renderFundTable(data: readonly FundNav[]): string {
  const rows = [...data].reverse().slice(0, 60).map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${formatNumber(item.nav)}</td><td>${formatNumber(item.accumulatedNav)}</td><td>${escapeHtml(item.source)}</td></tr>`).join('');
  return `<section class="table-wrap"><table><thead><tr><th>日期</th><th>单位净值</th><th>累计净值</th><th>来源</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function page(title: string, controls: readonly TrendControl[], active: string, nonce: string, content: string, resources?: ChartResources): string {
  const buttons = controls.map((control) => `<button type="button" data-period="${escapeHtml(control.id)}"${control.id === active ? ' aria-pressed="true"' : ''}>${escapeHtml(control.label)}</button>`).join('');
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'${chartCsp(resources)};"><style>${styles()}</style></head><body><main><header><h1>${escapeHtml(title)}</h1><nav class="segments" aria-label="走势区间">${buttons}</nav></header>${content}</main><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('[data-period]').forEach((button)=>button.addEventListener('click',()=>vscode.postMessage({command:'changePeriod',period:button.dataset.period})));</script>${chartRuntime(resources, nonce)}</body></html>`;
}

function styles(): string {
  return `:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}main{max-width:1180px;margin:0 auto;padding:20px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}h1{font-size:20px;margin:0}.segments{display:flex;border:1px solid var(--vscode-panel-border)}button{min-width:48px;padding:6px 10px;border:0;border-right:1px solid var(--vscode-panel-border);border-radius:0;color:var(--vscode-foreground);background:transparent;cursor:pointer}button:last-child{border-right:0}button[aria-pressed=true]{color:var(--vscode-button-foreground);background:var(--vscode-button-background)}.summary{display:grid;grid-template-columns:repeat(5,minmax(100px,1fr));gap:0;margin:20px 0;border-top:1px solid var(--vscode-panel-border);border-bottom:1px solid var(--vscode-panel-border)}.summary div{padding:10px 12px;border-right:1px solid var(--vscode-panel-border)}.summary div:last-child{border-right:0}dt{font-size:12px;color:var(--vscode-descriptionForeground)}dd{margin:4px 0 0;font-weight:600;font-variant-numeric:tabular-nums}.positive{color:var(--vscode-charts-red)}.negative{color:var(--vscode-charts-green)}.chart-wrap,.table-wrap{width:100%;overflow-x:auto}.echart{width:100%;height:390px;min-width:620px;border:1px solid var(--vscode-panel-border)}.chart-error{display:grid;place-items:center;color:var(--vscode-descriptionForeground)}.chart-meta,.legend{display:flex;justify-content:space-between;gap:16px;margin:8px 0;color:var(--vscode-descriptionForeground);font-size:12px}.legend{justify-content:flex-start}.chart{display:block;width:100%;min-width:620px;height:auto;border:1px solid var(--vscode-panel-border)}.grid{stroke:var(--vscode-panel-border);stroke-width:1}.up{fill:var(--vscode-charts-red);stroke:var(--vscode-charts-red)}.down{fill:var(--vscode-charts-green);stroke:var(--vscode-charts-green)}.volume{opacity:.35;stroke:none}table{width:100%;border-collapse:collapse;margin-top:18px;font-variant-numeric:tabular-nums}th,td{text-align:right;padding:7px 10px;border-bottom:1px solid var(--vscode-panel-border)}th:first-child,td:first-child{text-align:left}th{position:sticky;top:0;background:var(--vscode-editor-background)}.empty{padding:40px 0;color:var(--vscode-descriptionForeground)}@media(max-width:650px){main{padding:14px}.summary{grid-template-columns:repeat(2,1fr)}.summary div{border-bottom:1px solid var(--vscode-panel-border)}header{align-items:flex-start}.segments{width:100%;overflow-x:auto}button{flex:1}.echart{height:330px}}`;
}

function formatDate(value: string): string {
  return value.includes('T') ? value.replace('T', ' ').slice(0, 16) : value;
}

function formatNumber(value: number): string {
  return value >= 1000 ? value.toFixed(2) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
