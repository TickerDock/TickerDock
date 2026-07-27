import type { ReactElement } from 'react';
import { DataPage, DataTable, percent } from '../components/DataPage';
import type { FundHolding } from '../protocol';

export function FundHoldingsPage({ name, items, error }: { name: string; items?: FundHolding[]; error?: string }): ReactElement {
  return <DataPage title={`${name} 主要持仓`} loading={!items && !error} error={error}>{items?.length
    ? <><p className="meta">报告日期：{items[0]!.reportDate}</p><DataTable headers={['#', '代码', '名称', '净值占比', '持股数（万股）', '市值（万元）']} rows={items.map((item, index) => [index + 1, item.code, item.name, percent(item.navRatio), item.sharesWan.toFixed(2), item.marketValueWan.toFixed(2)])} /></>
    : <p className="empty">暂无数据。</p>}</DataPage>;
}
