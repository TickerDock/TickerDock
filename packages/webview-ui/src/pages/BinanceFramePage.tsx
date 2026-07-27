import type { ReactElement } from 'react';

export function BinanceFramePage({ title, source }: { title: string; source: string }): ReactElement {
  return <main className="binance-frame-page"><iframe id="stock-fund-binance-chart" src={source} title={title} referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" allowFullScreen /></main>;
}
