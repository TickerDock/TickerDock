import type { ChangeEvent, ReactElement } from 'react';

export function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void;
}): ReactElement {
  return <label className="setting-row"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }): ReactElement {
  return <label className="setting-row"><span>{label}</span><input className="toggle" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

export function TemplateRow({ label, value, defaultValue, title, onChange }: {
  label: string; value: string; defaultValue: string; title: string; onChange: (value: string) => void;
}): ReactElement {
  return <label className="setting-row template-row"><span>{label}</span><span className="template-input"><input value={value} maxLength={240} title={title} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} /><button className="icon-button" type="button" title="恢复此模板默认值" aria-label={`恢复${label}默认值`} onClick={() => onChange(defaultValue)}><i className="codicon codicon-discard" aria-hidden="true" /></button></span></label>;
}
