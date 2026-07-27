import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { PositionItem } from '../protocol';

export function StatusBarStocksDialog({ available, initial, onCancel, onSave }: {
  available: PositionItem[]; initial: string[]; onCancel: () => void; onSave: (codes: string[]) => void;
}): ReactElement {
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? available.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(normalized)) : available;
  }, [available, query]);
  const move = (code: string, delta: number) => setSelected((current) => {
    const from = current.indexOf(code); const to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return current;
    const next = [...current]; [next[from], next[to]] = [next[to]!, next[from]!]; return next;
  });
  const toggle = (code: string, checked: boolean) => setSelected((current) => checked
    ? current.includes(code) || current.length >= 8 ? current : [...current, code]
    : current.filter((value) => value !== code));
  const names = new Map(available.map((item) => [item.code, item.name]));

  return <div className="modal-shell" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="status-stocks-title">
      <header className="modal-head"><h2 id="status-stocks-title">状态栏股票</h2><span>{selected.length} / 8</span></header>
      <div className="selected-stocks">{selected.map((code, index) => <div className="selected-stock" key={code}><span>{names.get(code) ?? code}<small>{code}</small></span><span className="row-tools"><button className="icon-button" type="button" title="上移" aria-label={`上移 ${code}`} disabled={index === 0} onClick={() => move(code, -1)}><i className="codicon codicon-arrow-up" /></button><button className="icon-button" type="button" title="下移" aria-label={`下移 ${code}`} disabled={index === selected.length - 1} onClick={() => move(code, 1)}><i className="codicon codicon-arrow-down" /></button><button className="icon-button" type="button" title="移除" aria-label={`移除 ${code}`} onClick={() => toggle(code, false)}><i className="codicon codicon-close" /></button></span></div>)}</div>
      <input className="search" type="search" value={query} placeholder="搜索自选股票" aria-label="搜索自选股票" onChange={(event) => setQuery(event.target.value)} />
      <div className="stock-options">{visible.map((item) => <label className="stock-option" key={item.code}><input type="checkbox" checked={selected.includes(item.code)} disabled={!selected.includes(item.code) && selected.length >= 8} onChange={(event) => toggle(item.code, event.target.checked)} /><span>{item.name}</span><small>{item.code}</small></label>)}</div>
      <footer className="modal-actions"><button type="button" className="secondary" onClick={onCancel}>取消</button><button type="button" onClick={() => onSave(selected)}>保存</button></footer>
    </section>
  </div>;
}
