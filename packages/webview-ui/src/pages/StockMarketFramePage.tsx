import type { ReactElement } from 'react';
import { postMessage } from '../protocol';

export function StockMarketFramePage({ title, targets, mode, error }: { title: string; targets?: { standard: string; chips?: string }; mode: 'standard' | 'chips'; error?: string }): ReactElement {
  if (!targets) return <main className="market-frame-shell error"><header><h1>{title}</h1></header><p className="empty">{error ?? '正在加载行情...'}</p></main>;
  const active = mode === 'chips' && targets.chips ? 'chips' : 'standard';
  const source = active === 'chips' ? targets.chips! : targets.standard;
  // const isEastMoneyDetail = targets.standard.includes('/basic/full.html?mcid=');
  // className={`market-frame-shell${isEastMoneyDetail ? ' detail-frame' : ''}`}
  return <main className='market-frame-shell detail-frame'><header><h1>{title}</h1>{targets.chips && <nav className="segments" aria-label="股票图表模式"><button type="button" aria-pressed={active === 'standard'} onClick={() => postMessage('changeStockChartMode', { mode: 'standard' })}>标准行情</button><button type="button" aria-pressed={active === 'chips'} onClick={() => postMessage('changeStockChartMode', { mode: 'chips' })}>筹码分布</button></nav>}</header><iframe src={source} title={title} referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" /></main>;
}
