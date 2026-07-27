import type { ReactElement } from 'react';
import type { StockResearchItem } from '../protocol';
import { postMessage } from '../protocol';

export function StockResearchPage({ name, items }: { name: string; items?: StockResearchItem[] }): ReactElement {
  return <main className="reading-page">
    <header className="reading-head"><h1>{name}</h1></header>
    {!items ? <p className="empty">正在加载研报...</p> : items.length === 0
      ? <p className="empty">暂无相关韭研公社研报。</p>
      : <section>{items.map((item) => <article className="research-item" key={item.id}>
        <header><h2>{item.title}</h2><time>{item.time}</time></header>
        <p>{item.summary.slice(0, 1800)}</p>
        {trustedResearchUrl(item.url) && <button className="link-command" type="button" onClick={() => postMessage('openResearchUrl', { url: item.url })}>打开原文 <i className="codicon codicon-link-external" aria-hidden="true" /></button>}
      </article>)}</section>}
  </main>;
}

function trustedResearchUrl(value: string): boolean {
  return /^https:\/\/www\.jiuyangongshe\.com\/a\/[a-zA-Z0-9_-]+$/.test(value);
}
