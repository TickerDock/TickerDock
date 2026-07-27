import type { ReactElement, ReactNode } from 'react';
import type { FundExtendedDetail } from '../protocol';

const returns = [['week', '1W'], ['month', '1M'], ['threeMonth', '3M'], ['sixMonth', '6M'], ['year', '1年'], ['threeYear', '3年'], ['yearToDate', '今年以来'], ['sinceInception', '成立以来']] as const;
const probabilities = [['week', '持有7天'], ['month', '持有1个月'], ['threeMonth', '持有3个月'], ['sixMonth', '持有6个月'], ['year', '持有1年']] as const;

export function FundDetailPage({ title, detail, error }: { title: string; detail?: FundExtendedDetail; error?: string }): ReactElement {
  if (!detail) return <main className="detail-page"><header className="detail-head"><h1>{title}</h1></header><p className="empty">{error ?? '正在加载数据...'}</p></main>;
  const facts: Array<[string, string]> = [['基金规模', money(detail.sizeCny, detail.sizeDate)], ['基金经理', detail.manager || '--'], ['成立日期', detail.establishedDate || '--'], ['管理公司', detail.managementCompany || '--'], ['综合评级', detail.ratingStars === undefined ? '--' : `${detail.ratingStars} / 5`], ['跟踪标的', detail.trackingTarget || '--'], ['年化跟踪误差', optionalPercent(detail.annualTrackingErrorRatio)]];
  const availableReturns = returns.some(([key]) => detail.returns[key] !== undefined);
  const availableProbabilities = probabilities.filter(([key]) => detail.profitProbability[key] !== undefined);
  return <main className="detail-page"><header className="detail-head"><h1>{detail.name}</h1><p>{[detail.code, detail.fundType, detail.riskLevel].filter(Boolean).join('  |  ')}</p></header>
    <DetailSection title="基金概览"><div className="detail-grid">{facts.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div></DetailSection>
    <DetailSection title="业绩表现">{availableReturns ? <div className="detail-grid">{returns.map(([key, label]) => <Metric key={key} label={label} value={optionalPercent(detail.returns[key])} className={ratioClass(detail.returns[key])} />)}</div> : <Empty />}</DetailSection>
    <DetailSection title="盈利概率">{detail.overallScore !== undefined || detail.fundScore !== undefined ? <div className="score-row"><Metric label="综合评分" value={optionalNumber(detail.overallScore, 2)} /><Metric label="基金评分" value={optionalNumber(detail.fundScore, 3)} /></div> : null}{availableProbabilities.length ? availableProbabilities.map(([key, label]) => { const value = detail.profitProbability[key]!; return <div className="probability" key={key}><span>{label}</span><div className="track"><i style={{ width: `${Math.max(0, Math.min(value * 100, 100)).toFixed(2)}%` }} /></div><output>{percent(value)}</output></div>; }) : <Empty />}</DetailSection>
    <DetailSection title="机构评级">{detail.institutionRatings.length ? <Table headers={['日期', '招商证券', '济安金信', '上海证券']} rows={detail.institutionRatings.map((item) => [item.date, stars(item.merchantSecurities), stars(item.jianFundEvaluation), stars(item.shanghaiSecurities)])} /> : <Empty />}</DetailSection>
    <DetailSection title="同类基金">{detail.similarFunds.length ? <Table headers={['基金', '代码', '区间', '收益']} rows={detail.similarFunds.map((item) => [item.name, item.code, item.period || '--', optionalPercent(item.returnRatio)])} /> : <Empty />}</DetailSection>
    <DetailSection title={`主要持仓${detail.holdings[0]?.reportDate ? ` (${detail.holdings[0].reportDate})` : ''}`}>{detail.holdings.length ? <Table headers={['股票', '代码', '净值占比', '持股数（万股）', '市值（万元）']} rows={detail.holdings.map((item) => [item.name, item.code, percent(item.navRatio), item.sharesWan.toFixed(2), item.marketValueWan.toFixed(2)])} /> : <Empty />}</DetailSection>
  </main>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }): ReactElement { return <section className="detail-section"><h2>{title}</h2>{children}</section>; }
function Metric({ label, value, className = '' }: { label: string; value: string; className?: string }): ReactElement { return <div className="detail-metric"><span>{label}</span><strong className={className}>{value}</strong></div>; }
function Table({ headers, rows }: { headers: string[]; rows: string[][] }): ReactElement { return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table></div>; }
function Empty(): ReactElement { return <p className="empty">暂无数据。</p>; }
function money(value?: number, date?: string): string { if (value === undefined) return '--'; const amount = value >= 100_000_000 ? `${(value / 100_000_000).toFixed(2)} B CNY` : value >= 10_000 ? `${(value / 10_000).toFixed(2)} 10k CNY` : `${value.toFixed(2)} CNY`; return date ? `${amount} (${date})` : amount; }
function stars(value?: number): string { return value === undefined ? '--' : `${value} / 5`; }
function optionalNumber(value: number | undefined, digits: number): string { return value === undefined ? '--' : value.toFixed(digits); }
function percent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function optionalPercent(value?: number): string { return value === undefined ? '--' : percent(value); }
function ratioClass(value?: number): string { return value === undefined ? '' : value >= 0 ? 'up-text' : 'down-text'; }
