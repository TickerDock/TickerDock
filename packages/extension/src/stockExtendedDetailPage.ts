import { StockExtendedDetail, StockResearchItem, StockTechnicalLevels } from '@stock-fund/domain';

export function renderStockExtendedDetailPage(detail: StockExtendedDetail): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-editor-background)}main{max-width:1160px;margin:0 auto;padding:24px 28px 48px}header{padding-bottom:20px;border-bottom:1px solid var(--vscode-panel-border)}h1{margin:0;font-size:22px}header p{margin:6px 0 0;color:var(--vscode-descriptionForeground)}section{padding:22px 0;border-bottom:1px solid var(--vscode-panel-border)}h2{margin:0 0 14px;font-size:15px}.facts,.levels{display:grid;gap:1px;background:var(--vscode-panel-border)}.facts{grid-template-columns:repeat(5,minmax(0,1fr))}.levels{grid-template-columns:repeat(4,minmax(130px,1fr))}.fact,.level{min-height:68px;padding:12px;background:var(--vscode-editor-background)}.label{display:block;margin-bottom:6px;color:var(--vscode-descriptionForeground);font-size:12px}.value{font-variant-numeric:tabular-nums;font-size:17px}.up{color:var(--vscode-charts-red)}.down{color:var(--vscode-charts-green)}.note,.empty{color:var(--vscode-descriptionForeground);line-height:1.5}.warning{padding:12px;border-left:3px solid var(--vscode-charts-yellow);background:var(--vscode-textBlockQuote-background)}article{padding:10px 0;border-bottom:1px solid var(--vscode-panel-border)}article:last-child{border-bottom:0}article h3{margin:0 0 5px;font-size:14px}article p{margin:0;color:var(--vscode-descriptionForeground);line-height:1.45}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}th{color:var(--vscode-descriptionForeground);font-size:12px;font-weight:500}@media(max-width:700px){main{padding:18px 14px 36px}.facts,.levels{grid-template-columns:repeat(2,minmax(120px,1fr))}}
  </style></head><body><main><header><h1>${escapeHtml(detail.name)}</h1><p>${escapeHtml(detail.code)}  ${signedPercent(detail.changeRatio)}</p></header>${renderStockExtendedDetailSections(detail)}</main></body></html>`;
}

export function renderStockExtendedDetailSections(detail: StockExtendedDetail): string {
  return `${iwencaiSection(detail)}${technicalSection(detail.technical)}${sourceSection(detail)}${researchSection(detail.research)}`;
}

export function renderIwenCaiTokenPage(title: string, moduleUri: string, cspSource: string, nonce: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${escapeHtml(cspSource)};"><style>:root{color-scheme:light dark}body{display:grid;place-items:center;min-height:100vh;margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}p{color:var(--vscode-descriptionForeground)}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>正在加载股票诊断...</p></main><script type="module" nonce="${nonce}">import {getHexinToken} from ${JSON.stringify(moduleUri)};const vscode=acquireVsCodeApi();try{vscode.postMessage({command:'iwencaiToken',token:getHexinToken()});}catch(error){vscode.postMessage({command:'iwencaiTokenError',message:String(error)});}</script></body></html>`;
}

function iwencaiSection(detail: StockExtendedDetail): string {
  const data = detail.iwencai;
  if (!data) return '';
  const diagnosis = data.diagnosis ? `<div class="warning"><strong>${escapeHtml(data.diagnosis.title || '问财诊断')}</strong>${data.diagnosis.score === undefined ? '' : `<p>评分：${data.diagnosis.score}</p>`}<p>短期：${escapeHtml(data.diagnosis.short || '--')}</p><p>中期：${escapeHtml(data.diagnosis.mid || '--')}</p><p>长期：${escapeHtml(data.diagnosis.long || '--')}</p><p>${escapeHtml(data.diagnosis.content)}</p></div>` : '<div class="empty">暂无诊断结果。</div>';
  const official = [['热度', data.heat], ['压力位', data.pressure], ['支撑位', data.support], ['止盈位', data.takeProfit], ['止损位', data.stopLoss]];
  const concepts = data.concepts.length ? `<p>${data.concepts.map(({ title }) => escapeHtml(title)).join(' / ')}</p>` : '<div class="empty">暂无概念数据。</div>';
  const reports = data.institutionReports.length ? `<table><thead><tr><th>日期</th><th>评级</th><th>方向</th><th>目标价</th><th>研究员</th><th>问财评级</th></tr></thead><tbody>${data.institutionReports.map((item) => `<tr><td>${escapeHtml(item.reportDate)}</td><td>${escapeHtml(item.rating)}</td><td>${escapeHtml(item.direction)}</td><td>${escapeHtml(item.targetPrice)}</td><td>${escapeHtml(item.researcher)}</td><td>${escapeHtml(item.iwencaiRating)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">暂无机构报告。</div>';
  return `<section><h2>问财诊断</h2>${diagnosis}<h2 style="margin-top:20px">官方点位与热度</h2><div class="facts">${official.map(([label, value]) => `<div class="fact"><span class="label">${label}</span><span class="value">${escapeHtml(value ?? '--')}</span></div>`).join('')}</div><h2 style="margin-top:20px">所属概念</h2>${concepts}<h2 style="margin-top:20px">机构报告</h2>${reports}</section>`;
}

function technicalSection(levels: StockTechnicalLevels): string {
  const values: Array<[string, string]> = [
    ['当前价格', price(levels.currentPrice)], ['20日均线', optionalPrice(levels.movingAverage20)],
    ['60日均线', optionalPrice(levels.movingAverage60)], ['近期支撑', optionalPrice(levels.support)],
    ['近期压力', optionalPrice(levels.resistance)], ['参考止盈', optionalPrice(levels.takeProfit)],
    ['参考止损', optionalPrice(levels.stopLoss)], ['K线样本数', String(levels.sampleSize)],
  ];
  return `<section><h2>技术位</h2><p class="note">支撑、压力、止盈和止损根据近期K线计算，仅供参考，不构成投资建议。</p><div class="levels">${values.map(([label, value]) => `<div class="level"><span class="label">${label}</span><span class="value">${escapeHtml(value)}</span></div>`).join('')}</div></section>`;
}

function sourceSection(detail: StockExtendedDetail): string {
  return `<section><h2>数据源状态</h2>${detail.unavailableSources.length ? `<div class="warning">${detail.unavailableSources.map(escapeHtml).join('<br>')}</div>` : '<div class="note">所有已配置数据源均已返回数据。</div>'}</section>`;
}

function researchSection(items: readonly StockResearchItem[]): string {
  return `<section><h2>相关研报</h2>${items.length ? items.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.time)}  |  ${escapeHtml(item.source)}</p><p>${escapeHtml(item.summary)}</p></article>`).join('') : empty()}</section>`;
}

function price(value: number): string { return Number.isFinite(value) && value > 0 ? value.toFixed(2) : '--'; }
function optionalPrice(value: number | undefined): string { return value === undefined ? '--' : price(value); }
function signedPercent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function empty(): string { return '<div class="empty">暂无相关研报。</div>'; }
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
