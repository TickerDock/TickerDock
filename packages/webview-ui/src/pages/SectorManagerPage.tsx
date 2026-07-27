import { useState } from 'react';
import type { ReactElement } from 'react';
import { PageShell } from '../components/PageShell';
import type { Sector } from '../protocol';
import { postMessage } from '../protocol';

export function SectorManagerPage({ initial }: { initial: Sector[] }): ReactElement {
  const [rows, setRows] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const valid = rows.every((row) => /^BK\d{4}$/i.test(row.code.trim()) && row.name.trim() !== '');
  const update = (index: number, key: keyof Sector, value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
    setDirty(true);
  };

  return <PageShell title="板块管理" dirty={dirty} valid={valid} onSave={() => postMessage('saveSectors', { sectors: rows })}>
    <section className="content">
      <div className="section-head">
        <p>管理侧边栏中的板块行情入口。</p>
        <button type="button" onClick={() => { setRows((current) => [...current, { code: '', name: '' }]); setDirty(true); }}>
          <i className="codicon codicon-add" aria-hidden="true" />添加板块
        </button>
      </div>
      <div className="table-wrap">
        <table><thead><tr><th>代码</th><th>名称</th><th aria-label="操作" /></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>
            <td><input value={row.code} pattern="BK\d{4}" placeholder="BK0815" aria-label="板块代码" onChange={(event) => update(index, 'code', event.target.value)} /></td>
            <td><input value={row.name} placeholder="昨日涨停" aria-label="板块名称" onChange={(event) => update(index, 'name', event.target.value)} /></td>
            <td><button className="icon-button" type="button" title="删除板块" aria-label="删除板块" onClick={() => { setRows((current) => current.filter((_, rowIndex) => rowIndex !== index)); setDirty(true); }}><i className="codicon codicon-trash" aria-hidden="true" /></button></td>
          </tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="empty">暂无板块，请添加一个板块。</p>}
      </div>
    </section>
  </PageShell>;
}
