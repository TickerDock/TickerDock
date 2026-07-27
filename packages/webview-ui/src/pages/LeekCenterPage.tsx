import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { StockExtendedDetailContent } from './StockExtendedDetailPage';
import { getWebviewState, postMessage, PROTOCOL_VERSION, setWebviewState, type FundQuote, type LeekCenterPage as Page, type LeekCenterWatchlist, type StockExtendedDetail, type StockQuote } from '../protocol';

type Entry = { key: string; kind: 'stock'; group: string; item: StockQuote } | { key: string; kind: 'fund'; group: string; item: FundQuote };
type LeekCenterState = { tab?: 'data-center' | 'watchlist'; pageId?: string; selected?: string; watchlist?: LeekCenterWatchlist };
const groups = [['Market', '行情'], ['Trading', '交易'], ['Issuance', '发行'], ['Research', '研报']] as const;

export function LeekCenterPage({ pages, initialPageId, initialWatchlist }: { pages: Page[]; initialPageId: string; initialWatchlist: LeekCenterWatchlist }): ReactElement {
  const restored = useMemo(() => getWebviewState<LeekCenterState>(), []);
  const [tab, setTab] = useState<'data-center' | 'watchlist'>(restored?.tab ?? 'data-center');
  const [pageId, setPageId] = useState(restored?.pageId ?? initialPageId);
  const [watchlist, setWatchlist] = useState(restored?.watchlist ?? initialWatchlist);
  const [selected, setSelected] = useState(restored?.selected ?? '');
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);
  const [details, setDetails] = useState<Record<string, StockExtendedDetail | string>>({});
  const entries = useMemo(() => watchEntries(watchlist), [watchlist]);
  const activeEntry = entries.find((entry) => entry.key === selected) ?? entries[0];
  const activePage = pages.find((page) => page.id === pageId) ?? pages[0];
  useEffect(() => { setWebviewState({ tab, pageId, selected, watchlist } satisfies LeekCenterState); }, [pageId, selected, tab, watchlist]);
  useEffect(() => { if (activeEntry && activeEntry.key !== selected) setSelected(activeEntry.key); }, [activeEntry, selected]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data as Record<string, unknown>;
      if (message?.version !== PROTOCOL_VERSION || typeof message.type !== 'string' || !message.payload || typeof message.payload !== 'object') return;
      const payload = message.payload as Record<string, unknown>;
      if (message.type === 'leekWatchlistData') setWatchlist(payload.data as LeekCenterWatchlist);
      if (message.type === 'leekStockDetails' && typeof payload.key === 'string') setDetails((current) => ({ ...current, [payload.key as string]: payload.detail as StockExtendedDetail ?? String(payload.error ?? '未知错误') }));
    };
    window.addEventListener('message', listener); return () => window.removeEventListener('message', listener);
  }, []);
  useEffect(() => {
    if (!activeEntry || activeEntry.kind !== 'stock' || details[activeEntry.key] !== undefined) return;
    let token: string | undefined; try { token = window.__TICKERDOCK_GET_HEXIN_TOKEN__?.(); } catch { token = undefined; }
    setDetails((current) => ({ ...current, [activeEntry.key]: 'loading' }));
    postMessage('loadLeekStockDetails', { key: activeEntry.key, code: activeEntry.item.code, name: activeEntry.item.name, token });
  }, [activeEntry, details]);
  useEffect(() => { setFrameLoading(true); const timer = window.setTimeout(() => setFrameLoading(false), 12000); return () => window.clearTimeout(timer); }, [pageId, frameKey]);
  const selectPage = (id: string) => { setPageId(id); setFrameKey((value) => value + 1); };
  return <main className="leek-center"><nav className="leek-tabs" aria-label="Leek Center 页面"><button className={tab === 'data-center' ? 'active' : ''} onClick={() => setTab('data-center')}>数据中心</button><button className={tab === 'watchlist' ? 'active' : ''} onClick={() => setTab('watchlist')}>我的自选</button></nav>{tab === 'data-center' ? <section className="leek-data-shell"><nav className="leek-sidebar" aria-label="行情中心页面"><strong>行情中心</strong>{groups.map(([group, label]) => <section key={group}><h2>{label}</h2>{pages.filter((page) => page.group === group).map((page) => <button className={page.id === activePage?.id ? 'active' : ''} key={page.id} onClick={() => selectPage(page.id)}><span>{page.title}</span><small>{page.description}</small></button>)}</section>)}</nav><section className="leek-workspace"><header><div><strong>{activePage?.title}</strong><span>{activePage?.description}</span></div><button onClick={() => setFrameKey((value) => value + 1)}>刷新</button><button onClick={() => activePage && postMessage('openLeekExternal', { pageId: activePage.id })}>打开外部页面</button></header><div className="leek-frame-wrap">{frameLoading && <div className="leek-frame-state">正在加载数据页面...</div>}{activePage && <iframe key={`${activePage.id}:${frameKey}`} src={activePage.url} title="行情中心数据页面" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" onLoad={() => setFrameLoading(false)} />}</div></section></section> : <section className="leek-watch-shell"><aside className="leek-watch-sidebar"><header><strong>我的自选</strong><button className="icon-button" title="刷新自选行情" aria-label="刷新自选行情" onClick={() => postMessage('refreshLeekWatchlist', {})}><i className="codicon codicon-refresh" /></button></header><div className="leek-watch-list">{entries.length ? entries.map((entry, index) => <WatchItem entry={entry} active={entry.key === activeEntry?.key} showGroup={index === 0 || entries[index - 1]!.group !== entry.group || entries[index - 1]!.kind !== entry.kind} onClick={() => setSelected(entry.key)} key={entry.key} />) : <p className="empty compact">暂无股票或基金自选</p>}</div></aside><section className="leek-watch-detail">{activeEntry ? <WatchDetail entry={activeEntry} updatedAt={watchlist.updatedAt} detail={details[activeEntry.key]} /> : <p className="empty">暂无自选数据</p>}</section></section>}</main>;
}

function WatchItem({ entry, active, showGroup, onClick }: { entry: Entry; active: boolean; showGroup: boolean; onClick: () => void }): ReactElement { const value = entry.kind === 'stock' ? entry.item.price : entry.item.estimatedNav ?? entry.item.nav; const change = entry.kind === 'stock' ? entry.item.changeRatio : entry.item.estimatedChangeRatio ?? entry.item.navChangeRatio; return <>{showGroup && <div className="leek-watch-group">{entry.kind === 'stock' ? '股票' : '基金'} · {entry.group}</div>}<button className={`leek-watch-item${active ? ' active' : ''}`} onClick={onClick}><span>{entry.item.name || entry.item.code}</span><b className={ratioClass(change)}>{price(value)}</b><small>{entry.item.code}</small><small className={ratioClass(change)}>{percent(change)}</small></button></>; }

function WatchDetail({ entry, updatedAt, detail }: { entry: Entry; updatedAt: number; detail?: StockExtendedDetail | string }): ReactElement {
  const value = entry.kind === 'stock' ? entry.item.price : entry.item.estimatedNav ?? entry.item.nav;
  const change = entry.kind === 'stock' ? entry.item.changeRatio : entry.item.estimatedChangeRatio ?? entry.item.navChangeRatio;
  const overview: Array<[string, string]> = entry.kind === 'stock'
    ? [['现价', price(entry.item.price)], ['涨跌额', signed(entry.item.change)], ['最高/最低', `${price(entry.item.high)} / ${price(entry.item.low)}`], ['今开', price(entry.item.open)], ['昨收', price(entry.item.previousClose)]]
    : [['单位净值', price(entry.item.nav)], ['估算净值', price(entry.item.estimatedNav)], ['累计净值', price(entry.item.accumulatedNav)], ['净值日期', entry.item.navDate], ['数据来源', entry.item.source]];
  return <><header className="leek-detail-head"><h1>{entry.item.name || entry.item.code} <small>{entry.item.code}</small></h1><strong className={ratioClass(change)}>{price(value)}　{percent(change)}</strong></header><div className="leek-detail-body"><section><h2>行情概览</h2><div className="detail-grid">{overview.map(([label, metric]) => <Metric key={label} label={label} value={metric} />)}</div></section><section><h2>自选信息</h2><div className="detail-grid"><Metric label="所属分组" value={entry.group} /><Metric label="类型" value={entry.kind === 'stock' ? '股票' : '基金'} /><Metric label="行情状态" value={entry.item.status === 'live' ? '实时' : '暂无数据'} /><Metric label="更新时间" value={new Date(updatedAt).toLocaleString('zh-CN')} /><Metric label="代码" value={entry.item.code} /></div></section>{entry.kind === 'fund' ? <button onClick={() => postMessage('openLeekWatchlistDetails', { kind: 'fund', code: entry.item.code, name: entry.item.name })}>查看完整详情</button> : detail === 'loading' || detail === undefined ? <p className="empty">正在加载股票详情...</p> : typeof detail === 'string' ? <p className="warning-text">股票详情加载失败：{detail}</p> : <div className="leek-stock-detail"><StockExtendedDetailContent detail={detail} /></div>}</div></>;
}
function Metric({ label, value }: { label: string; value: string }): ReactElement { return <div className="detail-metric"><span>{label}</span><strong>{value}</strong></div>; }
function watchEntries(data: LeekCenterWatchlist): Entry[] { return [...data.funds.flatMap((group, groupIndex) => group.items.map((item) => ({ key: `fund:${groupIndex}:${item.code}`, kind: 'fund' as const, group: group.name, item }))), ...data.stocks.flatMap((group, groupIndex) => group.items.map((item) => ({ key: `stock:${groupIndex}:${item.code}`, kind: 'stock' as const, group: group.name, item })))]; }
function price(value?: number): string { return value !== undefined && Number.isFinite(value) ? value.toFixed(value >= 100 ? 2 : 4).replace(/0+$/, '').replace(/\.$/, '') : '--'; }
function percent(value?: number): string { return value === undefined || !Number.isFinite(value) ? '--' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function signed(value?: number): string { return value === undefined || !Number.isFinite(value) ? '--' : `${value >= 0 ? '+' : ''}${price(value)}`; }
function ratioClass(value?: number): string { return value !== undefined && value >= 0 ? 'up-text' : 'down-text'; }
