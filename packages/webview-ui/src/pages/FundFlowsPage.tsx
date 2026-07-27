import type { ReactElement } from 'react';
import { DataPage } from '../components/DataPage';
import type { FundFlowItem } from '../protocol';

export function FundFlowsPage({ industry, concept, region, error }: { industry?: FundFlowItem[]; concept?: FundFlowItem[]; region?: FundFlowItem[]; error?: string }): ReactElement {
  const loading = !industry && !concept && !region && !error;
  return <DataPage title="市场净流入" loading={loading} error={error}><FlowSection title="行业" items={industry ?? []} /><FlowSection title="概念" items={concept ?? []} /><FlowSection title="地区" items={region ?? []} /></DataPage>;
}

function FlowSection({ title, items }: { title: string; items: FundFlowItem[] }): ReactElement {
  const max = Math.max(...items.map((item) => Math.abs(item.netInflow)), 1);
  return <section className="flow-section"><h2>{title}</h2>{items.length ? items.map((item) => <div className="flow-row" key={item.code}><span>{item.name}</span><div className="track"><i className={item.netInflow >= 0 ? 'flow-up' : 'flow-down'} style={{ width: `${Math.max(1, Math.abs(item.netInflow) / max * 100).toFixed(1)}%` }} /></div><strong>{(item.netInflow / 100_000_000).toFixed(2)} B CNY</strong></div>) : <p className="empty">暂无数据。</p>}</section>;
}
