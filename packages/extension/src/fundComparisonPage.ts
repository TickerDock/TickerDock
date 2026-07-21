import { FundNav } from '@stock-fund/domain';
import { trendSummary } from './trendModel';
import { chartCsp, chartElement, ChartResources, chartRuntime } from './chartPage';

export interface FundComparisonSeries {
  code: string;
  name: string;
  data: FundNav[];
}

export interface ComparisonControl {
  id: string;
  label: string;
}

export function renderFundComparisonPage(
  series: readonly FundComparisonSeries[],
  failedCodes: readonly string[],
  controls: readonly ComparisonControl[],
  active: string,
  nonce: string,
  resources?: ChartResources
): string {
  const available = series.filter(({ data }) => data.length > 0).slice(0, 6);
  const content = available.length === 0
    ? '<div class="empty">暂无可比较的净值历史。</div>'
    : `${renderChart(available)}${renderTable(available)}`;
  const warning = failedCodes.length > 0
    ? `<p class="warning">暂无数据：${failedCodes.map(escapeHtml).join(', ')}</p>`
    : '';
  const buttons = controls.map((control) => `<button type="button" data-range="${escapeHtml(control.id)}"${control.id === active ? ' aria-pressed="true"' : ''}>${escapeHtml(control.label)}</button>`).join('');
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'${chartCsp(resources)};"><style>${styles()}</style></head><body><main><header><h1>基金业绩对比</h1><nav class="segments" aria-label="对比区间">${buttons}</nav></header>${warning}${content}</main><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('[data-range]').forEach((button)=>button.addEventListener('click',()=>vscode.postMessage({command:'changeRange',range:button.dataset.range})));</script>${chartRuntime(resources, nonce)}</body></html>`;
}

function renderChart(series: readonly FundComparisonSeries[]): string {
  const normalized = series.map((item) => {
    const ordered = [...item.data].sort((a, b) => a.date.localeCompare(b.date));
    const first = ordered[0]?.nav ?? 0;
    return downsample(ordered.flatMap((point) =>
      first > 0 ? [{ date: point.date, value: point.nav / first - 1 }] : []
    ), 500);
  });
  return `<section class="chart-wrap">${chartElement('fund-comparison-chart', {
    animation: false, tooltip: { trigger: 'axis' },
    legend: { data: series.map(({ name }) => name), top: 4, type: 'scroll' },
    grid: { left: 62, right: 24, top: 54, bottom: 64 },
    xAxis: { type: 'time', boundaryGap: false },
    yAxis: { type: 'value', scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }],
    series: normalized.map((points, index) => ({
      name: series[index]!.name, type: 'line', showSymbol: false, sampling: 'lttb',
      data: points.map(({ date, value }) => [date, value]),
    })),
  }, 'Normalized fund performance comparison')}</section>`;
}

function downsample<T>(items: readonly T[], maximum: number): T[] {
  if (items.length <= maximum) return [...items];
  const result: T[] = [];
  const step = (items.length - 1) / (maximum - 1);
  for (let index = 0; index < maximum; index += 1) {
    result.push(items[Math.round(index * step)]!);
  }
  return result;
}

function renderTable(series: readonly FundComparisonSeries[]): string {
  const rows = series.map((item, index) => {
    const ordered = [...item.data].sort((a, b) => a.date.localeCompare(b.date));
    const summary = trendSummary(ordered.map(({ nav }) => nav));
    return `<tr><td><i class="swatch color-bg-${index}"></i>${escapeHtml(item.name)}</td><td>${escapeHtml(item.code)}</td><td>${summary ? formatNumber(summary.latest) : '--'}</td><td class="${(summary?.changeRatio ?? 0) >= 0 ? 'positive' : 'negative'}">${summary ? formatPercent(summary.changeRatio) : '--'}</td><td>${summary ? formatNumber(summary.high) : '--'}</td><td>${summary ? formatNumber(summary.low) : '--'}</td><td>${ordered.length}</td></tr>`;
  }).join('');
  return `<section class="table-wrap"><table><thead><tr><th>基金</th><th>代码</th><th>最新净值</th><th>区间收益</th><th>最高</th><th>最低</th><th>样本数</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function styles(): string {
  return `:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}main{max-width:1180px;margin:0 auto;padding:20px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}h1{font-size:20px;margin:0}.segments{display:flex;border:1px solid var(--vscode-panel-border)}button{min-width:48px;padding:6px 10px;border:0;border-right:1px solid var(--vscode-panel-border);border-radius:0;color:var(--vscode-foreground);background:transparent;cursor:pointer}button:last-child{border-right:0}button[aria-pressed=true]{color:var(--vscode-button-foreground);background:var(--vscode-button-background)}.warning,.empty{color:var(--vscode-descriptionForeground)}.chart-wrap,.table-wrap{width:100%;overflow-x:auto}.echart{width:100%;height:430px;min-width:620px;margin-top:18px;border:1px solid var(--vscode-panel-border)}.chart-error{display:grid;place-items:center;color:var(--vscode-descriptionForeground)}.color-bg-0{background:var(--vscode-charts-blue)}.color-bg-1{background:var(--vscode-charts-red)}.color-bg-2{background:var(--vscode-charts-green)}.color-bg-3{background:var(--vscode-charts-purple)}.color-bg-4{background:var(--vscode-charts-orange)}.color-bg-5{background:var(--vscode-charts-yellow)}table{width:100%;border-collapse:collapse;margin-top:18px;font-variant-numeric:tabular-nums}th,td{text-align:right;padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}th:first-child,td:first-child{text-align:left}.swatch{display:inline-block;width:10px;height:10px;margin-right:7px}.positive{color:var(--vscode-charts-red)}.negative{color:var(--vscode-charts-green)}@media(max-width:650px){main{padding:14px}.segments{width:100%;overflow-x:auto}button{flex:1}.echart{height:350px}}`;
}

function formatNumber(value: number): string {
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
