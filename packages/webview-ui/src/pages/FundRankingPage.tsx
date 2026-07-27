import type { ReactElement } from 'react';
import { DataPage, DataTable, optionalPercent, percent } from '../components/DataPage';
import type { FundRankItem } from '../protocol';

export function FundRankingPage({ items, error }: { items?: FundRankItem[]; error?: string }): ReactElement {
  return <DataPage title="基金日收益排行" loading={!items && !error} error={error}>{items?.length
    ? <DataTable headers={['#', '代码', '名称', '净值', '日', '周', '月', '3月', '6月', '1年', '今年以来']} rows={items.map((item, index) => [index + 1, item.code, item.name, item.nav, percent(item.dayReturnRatio), optionalPercent(item.weekReturnRatio), optionalPercent(item.monthReturnRatio), optionalPercent(item.threeMonthReturnRatio), optionalPercent(item.sixMonthReturnRatio), optionalPercent(item.yearReturnRatio), optionalPercent(item.yearToDateReturnRatio)])} />
    : <p className="empty">暂无数据。</p>}</DataPage>;
}
