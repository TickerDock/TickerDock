import type { ReactElement } from 'react';
import { PositionManagerPage } from '../components/PositionManagerPage';
import type { PositionItem, StockPosition } from '../protocol';

export function StockPositionManagerPage({ items, initial }: { items: PositionItem[]; initial: StockPosition[] }): ReactElement {
  return <PositionManagerPage kind="stock" title="股票持仓" items={items} initial={initial} />;
}
