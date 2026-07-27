import type { ReactElement, ReactNode } from 'react';
import { DataTable } from '../components/DataPage';
import type { StockExtendedDetail } from '../protocol';

export function StockExtendedDetailPage({ title, detail, error }: { title: string; detail?: StockExtendedDetail; error?: string }): ReactElement {
  if (!detail) return <main className="detail-page"><header className="detail-head"><h1>{title}</h1></header><p className="empty">{error ?? '正在加载股票详情...'}</p></main>;
  return <main className="detail-page"><header className="detail-head"><h1>{detail.name}</h1><p>{detail.code}　<span className={detail.changeRatio >= 0 ? 'up-text' : 'down-text'}>{percent(detail.changeRatio)}</span></p></header><StockExtendedDetailContent detail={detail} /></main>;
}

export function StockExtendedDetailContent({ detail }: { detail: StockExtendedDetail }): ReactElement {
  const levels = detail.technical;
  const technical: Array<[string, string]> = [['当前价格', price(levels.currentPrice)], ['20日均线', optionalPrice(levels.movingAverage20)], ['60日均线', optionalPrice(levels.movingAverage60)], ['近期支撑', optionalPrice(levels.support)], ['近期压力', optionalPrice(levels.resistance)], ['参考止盈', optionalPrice(levels.takeProfit)], ['参考止损', optionalPrice(levels.stopLoss)], ['K线样本数', String(levels.sampleSize)]];
  return <>
    {detail.iwencai && <IwenCaiSection detail={detail} />}
    <DetailSection title="技术位"><p className="note">支撑、压力、止盈和止损根据近期K线计算，仅供参考，不构成投资建议。</p><div className="stock-levels">{technical.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div></DetailSection>
    <DetailSection title="数据源状态">{detail.unavailableSources.length ? <div className="warning-block">{detail.unavailableSources.map((source) => <div key={source}>{source}</div>)}</div> : <p className="note">所有已配置数据源均已返回数据。</p>}</DetailSection>
    <DetailSection title="相关研报">{detail.research.length ? detail.research.map((item) => <article className="research-item" key={item.id}><h3>{item.title}</h3><p>{item.time}　|　{item.source}</p><p>{item.summary}</p></article>) : <p className="empty">暂无相关研报。</p>}</DetailSection>
  </>;
}

function IwenCaiSection({ detail }: { detail: StockExtendedDetail }): ReactElement {
  const data = detail.iwencai!;
  const official: Array<[string, string]> = [['热度', data.heat ?? '--'], ['压力位', data.pressure ?? '--'], ['支撑位', data.support ?? '--'], ['止盈位', data.takeProfit ?? '--'], ['止损位', data.stopLoss ?? '--']];
  return <DetailSection title="问财诊断">
    {data.diagnosis ? <div className="warning-block"><strong>{data.diagnosis.title || '问财诊断'}</strong>{data.diagnosis.score !== undefined && <p>评分：{data.diagnosis.score}</p>}<p>短期：{data.diagnosis.short || '--'}</p><p>中期：{data.diagnosis.mid || '--'}</p><p>长期：{data.diagnosis.long || '--'}</p><p>{data.diagnosis.content}</p></div> : <p className="empty">暂无诊断结果。</p>}
    <h3 className="subheading">官方点位与热度</h3><div className="stock-facts">{official.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
    <h3 className="subheading">所属概念</h3>{data.concepts.length ? <p>{data.concepts.map((item) => item.title).join(' / ')}</p> : <p className="empty">暂无概念数据。</p>}
    <h3 className="subheading">机构报告</h3>{data.institutionReports.length ? <DataTable headers={['日期', '评级', '方向', '目标价', '研究员', '问财评级']} rows={data.institutionReports.map((item) => [item.reportDate, item.rating, item.direction, item.targetPrice, item.researcher, item.iwencaiRating])} /> : <p className="empty">暂无机构报告。</p>}
  </DetailSection>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }): ReactElement { return <section className="detail-section"><h2>{title}</h2>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }): ReactElement { return <div className="detail-metric"><span>{label}</span><strong>{value}</strong></div>; }
function price(value: number): string { return Number.isFinite(value) && value > 0 ? value.toFixed(2) : '--'; }
function optionalPrice(value?: number): string { return value === undefined ? '--' : price(value); }
function percent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
