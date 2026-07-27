import type { ReactElement } from 'react';
import { EChart } from '../components/EChart';
import { postMessage, type StockKline } from '../protocol';

type Control = { id: string; label: string };

export function StockKlinePage({ title, code, data, controls, active, error }: {
  title: string; code: string; data?: StockKline[]; controls: Control[]; active: string; error?: string;
}): ReactElement {
  const ordered = [...(data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const finite = ordered.flatMap((point) => [point.open, point.close, point.high, point.low]).filter(Number.isFinite);
  const latest = ordered.at(-1)?.close;
  const first = ordered[0]?.open;
  const change = latest !== undefined && first !== undefined && first !== 0 ? (latest - first) / first : undefined;
  const high = finite.length ? Math.max(...finite) : undefined;
  const low = finite.length ? Math.min(...finite) : undefined;
  return <main className="trend-page">
    <header className="trend-head">
      <div><h1>{title}</h1><p className="meta">{code}</p></div>
      <nav className="segments" aria-label="K线周期">{controls.map((control) => <button key={control.id} type="button" aria-pressed={active === control.id} onClick={() => postMessage('changeStockKlinePeriod', { period: control.id })}>{control.label}</button>)}</nav>
    </header>
    {!data && !error ? <p className="empty">正在加载走势数据...</p> : error ? <p className="empty">{error}</p> : ordered.length === 0 ? <p className="empty">暂无 K 线数据。</p> : <>
      <dl className="trend-summary">
        <Metric label="最新" value={format(latest)} />
        <Metric label="区间涨跌" value={change === undefined ? '--' : `${change >= 0 ? '+' : ''}${(change * 100).toFixed(2)}%`} className={change !== undefined && change >= 0 ? 'up-text' : 'down-text'} />
        <Metric label="最高" value={format(high)} />
        <Metric label="最低" value={format(low)} />
        <Metric label="样本数" value={String(ordered.length)} />
      </dl>
      <section className="chart-wrap"><EChart className="trend-echart" label={`${title} K线图`} option={{ animation: false, tooltip: { trigger: 'axis' }, grid: { left: 58, right: 24, top: 24, bottom: 64 }, xAxis: { type: 'category', boundaryGap: false, data: ordered.map((point) => point.date), axisLabel: { hideOverlap: true } }, yAxis: { type: 'value', scale: true }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 12 }], series: [{ type: 'candlestick', data: ordered.map((point) => [point.open, point.close, point.low, point.high]) }] }} /></section>
      <section className="table-wrap"><table className="trend-table"><thead><tr><th>日期</th><th>开盘</th><th>收盘</th><th>最高</th><th>最低</th><th>成交量</th></tr></thead><tbody>{[...ordered].reverse().slice(0, 60).map((point) => <tr key={point.date}><td>{point.date}</td><td>{format(point.open)}</td><td>{format(point.close)}</td><td>{format(point.high)}</td><td>{format(point.low)}</td><td>{point.volume === undefined ? '--' : format(point.volume)}</td></tr>)}</tbody></table></section>
    </>}
  </main>;
}

function Metric({ label, value, className = '' }: { label: string; value: string; className?: string }): ReactElement {
  return <div><dt>{label}</dt><dd className={className}>{value}</dd></div>;
}

function format(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return value.toFixed(value >= 100 ? 2 : 4).replace(/0+$/, '').replace(/\.$/, '');
}
