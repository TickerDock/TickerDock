import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { postMessage } from '../protocol';

export function PageShell({ title, dirty, valid = true, onSave, children }: {
  title: string;
  dirty: boolean;
  valid?: boolean;
  onSave: () => void;
  children: ReactNode;
}): ReactElement {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => { postMessage('setDirty', { dirty }); }, [dirty]);

  return <main className="shell">
    <header className="toolbar">
      <h1>{title}</h1>
      <span className="dirty" aria-live="polite">{dirty ? '未保存' : ''}</span>
      <button className="primary" type="button" onClick={onSave} disabled={!dirty || !valid} title={!valid ? '请先完成必填项' : undefined}>
        <i className="codicon codicon-save" aria-hidden="true" />保存
      </button>
    </header>
    {children}
  </main>;
}
