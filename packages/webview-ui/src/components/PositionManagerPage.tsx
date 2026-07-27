import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { FundPosition, PositionItem, StockPosition } from '../protocol';
import { postMessage } from '../protocol';
import { PageShell } from './PageShell';

type Position = StockPosition | FundPosition;

export function PositionManagerPage({ kind, title, items, initial }: {
  kind: 'stock' | 'fund';
  title: string;
  items: PositionItem[];
  initial: Position[];
}): ReactElement {
  const [rows, setRows] = useState(() => new Map(initial.map((position) => [position.code, position])));
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? items.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(normalized)) : items;
  }, [items, query]);
  const valid = [...rows.values()].every((value) => kind === 'stock' ? isValidStock(value) : isValidFund(value));
  const update = (code: string, patch: Partial<Position>) => {
    setRows((current) => new Map(current).set(code, {
      ...(current.get(code) ?? (kind === 'stock' ? { code, soldOut: false } : { code })),
      ...patch,
    } as Position));
    setDirty(true);
  };
  const clear = (code: string) => {
    setRows((current) => { const next = new Map(current); next.delete(code); return next; });
    setDirty(true);
  };
  const saveType = kind === 'stock' ? 'saveStockPositions' : 'saveFundPositions';

  return <PageShell title={title} dirty={dirty} valid={valid} onSave={() => postMessage(saveType, { positions: [...rows.values()] })}>
    <section className="content">
      <div className="section-head">
        <p>配置后，侧边栏会显示对应的持仓收益。</p>
        <input className="search" type="search" value={query} placeholder="搜索资产" aria-label="搜索资产" onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="table-wrap">
        <table><thead><tr><th>资产</th>{kind === 'stock' ? <><th>数量</th><th>成本价</th><th>今日交易价</th><th>已清仓</th></> : <><th>份额</th><th>成本净值</th></>}<th aria-label="操作" /></tr></thead>
          <tbody>{filteredItems.map((item) => <PositionRow key={item.code} kind={kind} item={item} value={rows.get(item.code)} update={update} clear={() => clear(item.code)} />)}</tbody>
        </table>
        {filteredItems.length === 0 && <p className="empty">暂无可配置的持仓资产。</p>}
      </div>
    </section>
  </PageShell>;
}

function PositionRow({ kind, item, value, update, clear }: {
  kind: 'stock' | 'fund'; item: PositionItem; value?: Position;
  update: (code: string, patch: Partial<Position>) => void; clear: () => void;
}): ReactElement {
  const input = (name: string, current: number | undefined) => <input name={name} type="number" min="0" step="any" value={current ?? ''} onChange={(event) => {
    const text = event.target.value;
    update(item.code, { [name]: text === '' ? undefined : Number(text) });
  }} />;
  const stock = value as StockPosition | undefined;
  const fund = value as FundPosition | undefined;
  return <tr><td className="asset"><strong>{item.name}</strong><small>{item.code}</small></td>
    {kind === 'stock' ? <><td>{input('quantity', stock?.quantity)}</td><td>{input('costPrice', stock?.costPrice)}</td><td>{input('todayTradePrice', stock?.todayTradePrice)}</td><td><input type="checkbox" checked={Boolean(stock?.soldOut)} aria-label={`${item.name} 已清仓`} onChange={(event) => update(item.code, { soldOut: event.target.checked, soldOutDate: undefined })} /></td></> : <><td>{input('shares', fund?.shares)}</td><td>{input('costNav', fund?.costNav)}</td></>}
    <td><button className="icon-button" type="button" title="清空持仓" aria-label={`清空 ${item.name} 持仓`} onClick={clear}><i className="codicon codicon-clear-all" aria-hidden="true" /></button></td>
  </tr>;
}

function isValidStock(value: Position): value is StockPosition {
  const stock = value as StockPosition;
  return typeof stock.quantity === 'number' && stock.quantity > 0
    && typeof stock.costPrice === 'number' && stock.costPrice > 0
    && (stock.todayTradePrice === undefined || (typeof stock.todayTradePrice === 'number' && stock.todayTradePrice > 0))
    && typeof stock.soldOut === 'boolean';
}

function isValidFund(value: Position): value is FundPosition {
  const fund = value as FundPosition;
  return typeof fund.shares === 'number' && fund.shares > 0 && typeof fund.costNav === 'number' && fund.costNav > 0;
}
