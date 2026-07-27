import type { ReactElement } from 'react';
import { EChart } from '../components/EChart';
import { postMessage, type ComparisonControl, type FundComparisonSeries } from '../protocol';

const colors = ['blue', 'red', 'green', 'purple', 'orange', 'yellow'];

export function FundComparisonPage({ series, failedCodes, controls, active, error }: { series?: FundComparisonSeries[]; failedCodes: string[]; controls: ComparisonControl[]; active: string; error?: string }): ReactElement {
  const available = (series ?? []).filter(({ data }) => data.length > 0).slice(0, 6);
  return <main className="comparison-page"><header className="comparison-head"><h1>基金业绩对比</h1><nav className="segments" aria-label="对比区间">{controls.map((control) => <button type="button" key={control.id} aria-pressed={control.id === active} onClick={() => postMessage('changeFundComparisonRange', { range: control.id })}>{control.label}</button>)}</nav></header>
    {!series && !error ? <p className="empty">正在加载数据...</p> : error ? <p className="empty">{error}</p> : <>{failedCodes.length > 0 && <p className="warning-text">暂无数据：{failedCodes.join(', ')}</p>}{available.length === 0 ? <p className="empty">暂无可比较的净值历史。</p> : <><ComparisonChart series={available} /><ComparisonTable series={available} /></>}</>}
  </main>;
}

function ComparisonChart({ series }: { series: FundComparisonSeries[] }): ReactElement {
  const normalized = series.map((item) => {
    const ordered = [...item.data].sort((a, b) => a.date.localeCompare(b.date));
    const first = ordered[0]?.nav ?? 0;
    return downsample(ordered.flatMap((point) => first > 0 ? [[point.date, point.nav / first - 1] as [string, number]] : []), 500);
  });
  return <section className="chart-wrap"><EChart className="comparison-echart" label="基金标准化业绩对比图" option={{ animation: false, tooltip: { trigger: 'axis' }, legend: { data: series.map(({ name }) => name), top: 4, type: 'scroll' }, grid: { left: 62, right: 24, top: 54, bottom: 64 }, xAxis: { type: 'time', boundaryGap: false }, yAxis: { type: 'value', scale: true, axisLabel: { formatter: (value: number) => `${(value * 100).toFixed(0)}%` } }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }], series: normalized.map((data, index) => ({ name: series[index]!.name, type: 'line', showSymbol: false, sampling: 'lttb', data })) }} /></section>;
}

function ComparisonTable({ series }: { series: FundComparisonSeries[] }): ReactElement {
  return <section className="table-wrap"><table className="comparison-table"><thead><tr><th>基金</th><th>代码</th><th>最新净值</th><th>区间收益</th><th>最高</th><th>最低</th><th>样本数</th></tr></thead><tbody>{series.map((item, index) => {
    const ordered = [...item.data].sort((a, b) => a.date.localeCompare(b.date)); const summary = trendSummary(ordered.map(({ nav }) => nav));
    return <tr key={item.code}><td><i className={`swatch chart-${colors[index]}`} />{item.name}</td><td>{item.code}</td><td>{summary ? formatNumber(summary.latest) : '--'}</td><td className={(summary?.changeRatio ?? 0) >= 0 ? 'up-text' : 'down-text'}>{summary ? formatPercent(summary.changeRatio) : '--'}</td><td>{summary ? formatNumber(summary.high) : '--'}</td><td>{summary ? formatNumber(summary.low) : '--'}</td><td>{ordered.length}</td></tr>;
  })}</tbody></table></section>;
}

function trendSummary(values: number[]): { latest: number; high: number; low: number; changeRatio: number } | undefined {
  const finite = values.filter(Number.isFinite); if (!finite.length) return undefined; const first = finite[0]!; const latest = finite.at(-1)!;
  return { latest, high: Math.max(...finite), low: Math.min(...finite), changeRatio: first === 0 ? 0 : (latest - first) / first };
}
function downsample<T>(items: T[], maximum: number): T[] { if (items.length <= maximum) return items; const step = (items.length - 1) / (maximum - 1); return Array.from({ length: maximum }, (_, index) => items[Math.round(index * step)]!); }
function formatNumber(value: number): string { return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''); }
function formatPercent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
