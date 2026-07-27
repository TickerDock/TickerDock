import type { ReactElement } from 'react';
import { PositionManagerPage } from '../components/PositionManagerPage';
import type { FundPosition, PositionItem } from '../protocol';

export function FundPositionManagerPage({ items, initial }: { items: PositionItem[]; initial: FundPosition[] }): ReactElement {
  return <PositionManagerPage kind="fund" title="基金持仓" items={items} initial={initial} />;
}
