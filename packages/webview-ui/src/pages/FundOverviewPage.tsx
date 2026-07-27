import { useState, type ReactElement } from 'react';
import { EChart } from '../components/EChart';
import { postMessage, type FundNav, type FundQuote } from '../protocol';

const ranges = [{ id: '1m', label: '1M' }, { id: '3m', label: '3M' }, { id: '6m', label: '6M' }, { id: '1y', label: '1年' }, { id: 'all', label: '全部' }];

export function FundOverviewPage({ funds, selectedCode, history, range, loading, error }: { funds: FundQuote[]; selectedCode: string; history: FundNav[]; range: string; loading: boolean; error?: string }): ReactElement {
  const [search, setSearch] = useState('');
  const selected = funds.find(({ code }) => code === selectedCode) ?? funds[0];
  const visible = funds.filter((fund) => `${fund.code} ${fund.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <main className="fund-overview"><aside className="fund-overview-sidebar"><header><h1>基金走势</h1><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索基金" aria-label="搜索基金" /></header><div className="overview-funds">{visible.length ? visible.map((fund) => <FundListItem key={fund.code} fund={fund} selected={fund.code === selected?.code} />) : <p className="empty compact">{funds.length ? '没有匹配的基金。' : '暂无自选基金。'}</p>}</div></aside><section className="overview-detail">{selected ? <FundDetail fund={selected} history={history} range={range} loading={loading} error={error} /> : <p className="empty">暂无自选基金。</p>}</section></main>;
}

function FundListItem({ fund, selected }: { fund: FundQuote; selected: boolean }): ReactElement {
  const change = fund.estimatedChangeRatio ?? fund.navChangeRatio; const nav = fund.estimatedNav ?? fund.nav;
  return <button className={`overview-fund${selected ? ' selected' : ''}`} type="button" onClick={() => postMessage('selectFundOverviewFund', { code: fund.code })}><span><strong>{fund.name}</strong><small>{fund.code}</small></span><span className="numbers"><b>{formatNav(nav)}</b><small className={ratioClass(change)}>{formatPercent(change)}</small></span></button>;
}

function FundDetail({ fund, history, range, loading, error }: { fund: FundQuote; history: FundNav[]; range: string; loading: boolean; error?: string }): ReactElement {
  const change = fund.estimatedChangeRatio ?? fund.navChangeRatio;
  return <><header className="overview-detail-head"><div><h2>{fund.name}</h2><p>{fund.code} · {fund.status === 'live' ? '实时行情' : '行情不可用'}</p></div><nav className="segments" aria-label="走势区间">{ranges.map((item) => <button type="button" key={item.id} aria-pressed={item.id === range} onClick={() => postMessage('changeFundOverviewRange', { range: item.id })}>{item.label}</button>)}</nav></header><dl className="overview-quote-summary"><Metric label="确认净值" value={formatNav(fund.nav)} note={fund.navDate || '--'} /><Metric label="估算净值" value={fund.estimatedNav === undefined ? '--' : formatNav(fund.estimatedNav)} note={fund.estimateTime ?? '--'} /><Metric label="当前涨跌" value={formatPercent(change)} note={fund.estimatedNav === undefined ? '已确认' : '估算'} className={ratioClass(change)} /><Metric label="累计净值" value={formatNav(fund.accumulatedNav)} note={fund.source} /></dl>{loading ? <p className="empty">正在加载净值历史...</p> : error ? <p className="warning-text">{error}</p> : history.length ? <HistoryContent data={history} /> : <p className="empty">暂无净值历史。</p>}</>;
}

function HistoryContent({ data }: { data: FundNav[] }): ReactElement {
  const ordered = [...data].sort((a, b) => a.date.localeCompare(b.date)); const summary = trendSummary(ordered.map(({ nav }) => nav)); const points = downsample(ordered, 500);
  return <>{summary && <dl className="overview-period-summary"><Metric label="区间收益" value={formatPercent(summary.changeRatio)} className={ratioClass(summary.changeRatio)} /><Metric label="最高" value={formatNav(summary.high)} /><Metric label="最低" value={formatNav(summary.low)} /><Metric label="样本数" value={String(data.length)} /></dl>}<section className="chart-wrap"><EChart className="overview-echart" label="基金净值走势" option={{ animation: false, tooltip: { trigger: 'axis' }, legend: { data: ['单位净值', '累计净值'], top: 4 }, grid: { left: 58, right: 24, top: 48, bottom: 64 }, xAxis: { type: 'category', boundaryGap: false, data: points.map(({ date }) => date), axisLabel: { hideOverlap: true } }, yAxis: { type: 'value', scale: true }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }], series: [{ name: '单位净值', type: 'line', showSymbol: false, data: points.map(({ nav }) => nav) }, { name: '累计净值', type: 'line', showSymbol: false, data: points.map(({ accumulatedNav }) => accumulatedNav) }] }} /></section><div className="table-wrap"><table className="overview-history-table"><thead><tr><th>日期</th><th>单位净值</th><th>累计净值</th></tr></thead><tbody>{[...ordered].reverse().slice(0, 40).map((item) => <tr key={item.date}><td>{item.date}</td><td>{formatNav(item.nav)}</td><td>{formatNav(item.accumulatedNav)}</td></tr>)}</tbody></table></div></>;
}

function Metric({ label, value, note, className = '' }: { label: string; value: string; note?: string; className?: string }): ReactElement { return <div><dt>{label}</dt><dd className={className}>{value}</dd>{note && <small>{note}</small>}</div>; }
function trendSummary(values: number[]): { high: number; low: number; changeRatio: number } | undefined { const finite = values.filter(Number.isFinite); if (!finite.length) return undefined; const first = finite[0]!; const latest = finite.at(-1)!; return { high: Math.max(...finite), low: Math.min(...finite), changeRatio: first === 0 ? 0 : (latest - first) / first }; }
function downsample<T>(items: T[], maximum: number): T[] { if (items.length <= maximum) return items; const step = (items.length - 1) / (maximum - 1); return Array.from({ length: maximum }, (_, index) => items[Math.round(index * step)]!); }
function formatNav(value: number): string { return Number.isFinite(value) && value > 0 ? value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : '--'; }
function formatPercent(value?: number): string { return value === undefined ? '--' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function ratioClass(value?: number): string { return value === undefined ? '' : value >= 0 ? 'up-text' : 'down-text'; }
