import type { ReactElement, ReactNode } from 'react';

export function DataPage({ title, loading, error, children }: { title: string; loading?: boolean; error?: string; children: ReactNode }): ReactElement {
  return <main className="data-page"><header><h1>{title}</h1></header>{loading ? <p className="empty">正在加载数据...</p> : error ? <p className="empty">{error}</p> : children}</main>;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }): ReactElement {
  return <div className="table-wrap"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table></div>;
}

export function percent(value: number): string { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
export function optionalPercent(value?: number): string { return value === undefined ? '--' : percent(value); }
