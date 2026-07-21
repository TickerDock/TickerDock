import { MarketSentimentSnapshot, StockConnectFlowPoint } from '@stock-fund/domain';
import { chartCsp, chartElement, ChartResources, chartRuntime } from './chartPage';

export function renderMarketSentimentPage(snapshot: MarketSentimentSnapshot, nonce: string, resources?: ChartResources): string {
  const breadth = snapshot.breadth;
  const total = breadth ? breadth.rising + breadth.falling + breadth.unchanged : 0;
  const statistics = breadth ? `<section class="stats"><div><span>全部</span><strong>${total}</strong></div><div class="up"><span>上涨</span><strong>${breadth.rising}</strong></div><div class="up"><span>涨停</span><strong>${breadth.limitUp}</strong><small>自然涨停 ${breadth.naturalLimitUp}</small></div><div class="down"><span>下跌</span><strong>${breadth.falling}</strong></div><div class="down"><span>跌停</span><strong>${breadth.limitDown}</strong></div></section>` : empty('暂无市场涨跌数据。');
  const distribution = breadth ? renderDistribution([
    ['涨停', breadth.distribution.limitUp, 'up'],
    ['涨停 ~ 5%', breadth.distribution.aboveFive, 'up'],
    ['5% ~ 1%', breadth.distribution.upOneToFive, 'up'],
    ['1% ~ 0%', breadth.distribution.upZeroToOne, 'up'],
    ['平盘', breadth.distribution.flat, 'flat'],
    ['0% ~ -1%', breadth.distribution.downZeroToOne, 'down'],
    ['-1% ~ -5%', breadth.distribution.downOneToFive, 'down'],
    ['-5% ~ 跌停', breadth.distribution.belowFive, 'down'],
    ['跌停', breadth.distribution.limitDown, 'down'],
  ]) : empty('暂无涨跌分布数据。');
  const themes = snapshot.hotThemes.length > 0
    ? `<table><thead><tr><th>题材</th><th>涨跌幅</th><th>领涨股</th><th>涨跌幅</th></tr></thead><tbody>${snapshot.hotThemes.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="${direction(item.changeRatio)}">${percent(item.changeRatio)}</td><td>${escapeHtml(item.leadingStockName)} <small>${escapeHtml(item.leadingStockCode)}</small></td><td class="${direction(item.leadingStockChangeRatio)}">${percent(item.leadingStockChangeRatio)}</td></tr>`).join('')}</tbody></table>`
    : empty('暂无热门题材数据。');
  return page(`
    <header><div><h1>牛熊风向标</h1><p>${breadth?.time ? `更新时间 ${escapeHtml(breadth.time)}` : '当前A股市场涨跌概况'}</p></div></header>
    ${statistics}
    <section><h2>涨跌分布</h2>${distribution}</section>
    <section><h2>热门题材</h2>${themes}</section>
    <section><h2>沪深港通净流入</h2>${renderFlowChart(snapshot.stockConnectFlow)}</section>`, nonce, resources);
}

export function renderMarketSentimentError(error: unknown, nonce: string, resources?: ChartResources): string {
  return page(`<header><div><h1>牛熊风向标</h1></div></header>${empty(error instanceof Error ? error.message : String(error))}`, nonce, resources);
}

function renderDistribution(items: Array<[string, number, string]>): string {
  return chartElement('market-distribution-chart', {
    animation: false, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 18, right: 18, top: 34, bottom: 48 },
    xAxis: { type: 'category', data: items.map(([label]) => label), axisLabel: { interval: 0 } },
    yAxis: { type: 'value', minInterval: 1, show: false },
    series: [{ name: '股票', type: 'bar', barMaxWidth: 52, label: { show: true, position: 'top' }, data: items.map(([, value, kind]) => ({
      value, itemStyle: { color: kind === 'up' ? '$chart-rise' : kind === 'down' ? '$chart-fall' : '$chart-flat' },
    })) }],
  }, 'A股涨跌分布');
}

function renderFlowChart(points: readonly StockConnectFlowPoint[]): string {
  if (points.length === 0) return empty('暂无有效的沪深港通资金流数据。');
  return chartElement('stock-connect-flow-chart', {
    animation: false, tooltip: { trigger: 'axis' },
    legend: { data: ['沪股通', '深股通', '北向资金'], top: 4 },
    grid: { left: 62, right: 24, top: 48, bottom: 58 },
    xAxis: { type: 'category', boundaryGap: false, data: points.map(({ time }) => time), axisLabel: { hideOverlap: true } },
    yAxis: { type: 'value', scale: true }, dataZoom: [{ type: 'inside' }],
    series: [
      { name: '沪股通', type: 'line', showSymbol: false, data: points.map((point) => point.shanghaiNetInflowYi) },
      { name: '深股通', type: 'line', showSymbol: false, data: points.map((point) => point.shenzhenNetInflowYi) },
      { name: '北向资金', type: 'line', showSymbol: false, data: points.map((point) => point.northboundNetInflowYi) },
    ],
  }, '沪深港通净流入图');
}

function page(body: string, nonce: string, resources?: ChartResources): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'${chartCsp(resources)};"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}main{max-width:1120px;margin:0 auto;padding:20px}header{border-bottom:1px solid var(--vscode-panel-border);padding-bottom:14px}h1{margin:0;font-size:21px}header p{margin:5px 0 0;color:var(--vscode-descriptionForeground)}h2{margin:28px 0 12px;font-size:16px}.stats{display:grid;grid-template-columns:repeat(5,1fr);margin-top:20px;border-top:1px solid var(--vscode-panel-border);border-bottom:1px solid var(--vscode-panel-border)}.stats div{padding:12px;border-right:1px solid var(--vscode-panel-border)}.stats div:last-child{border-right:0}.stats span,.stats strong,.stats small{display:block}.stats span,.stats small{color:var(--vscode-descriptionForeground);font-size:12px}.stats strong{margin:5px 0;font-size:22px}.up strong,.up{color:var(--vscode-charts-red)}.down strong,.down{color:var(--vscode-charts-green)}table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;text-align:right;border-bottom:1px solid var(--vscode-panel-border)}th:first-child,td:first-child,th:nth-child(3),td:nth-child(3){text-align:left}th{color:var(--vscode-descriptionForeground);font-size:12px}.flat{color:var(--vscode-descriptionForeground)}td small{color:var(--vscode-descriptionForeground)}.empty{padding:28px 0;color:var(--vscode-descriptionForeground)}.echart{width:100%;height:340px;min-width:620px;border:1px solid var(--vscode-panel-border)}#market-distribution-chart{height:320px}.chart-error{display:grid;place-items:center;color:var(--vscode-descriptionForeground)}@media(max-width:720px){main{padding:14px}.stats{grid-template-columns:repeat(2,1fr)}.stats div{border-bottom:1px solid var(--vscode-panel-border)}.echart{height:300px}}
  </style></head><body><main>${body}</main>${chartRuntime(resources, nonce)}</body></html>`;
}

function empty(message: string): string { return `<div class="empty">${escapeHtml(message)}</div>`; }
function direction(value: number): string { return value > 0 ? 'up' : value < 0 ? 'down' : 'flat'; }
function percent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
