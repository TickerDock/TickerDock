import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { PageShell } from '../components/PageShell';
import { SelectRow } from '../components/SettingsControls';
import type { AiSettingsState } from '../protocol';
import { postMessage, PROTOCOL_VERSION } from '../protocol';

export function AiSettingsPage({ initial }: { initial: AiSettingsState }): ReactElement {
  const [state, setState] = useState(initial);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const set = <K extends keyof AiSettingsState>(key: K, value: AiSettingsState[K]) => {
    setState((current) => ({ ...current, [key]: value })); setDirty(true); setStatus('');
  };
  const valid = validBaseUrl(state.baseUrl) && state.model.trim().length > 0 && state.model.length <= 160 && apiKey.length <= 4096;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data as Record<string, unknown> | undefined;
      if (!message || message.version !== PROTOCOL_VERSION || typeof message.type !== 'string') return;
      const payload = message.payload as Record<string, unknown> | undefined;
      if (message.type === 'aiKeyLoaded') {
        setApiKey(typeof payload?.apiKey === 'string' ? payload.apiKey : '');
        setLoadingApiKey(false); setShowApiKey(true);
      }
      if (message.type === 'aiSettingsSaved' && payload?.state) {
        setState(payload.state as AiSettingsState); setApiKey(''); setShowApiKey(false); setDirty(false);
        setStatus(typeof payload.status === 'string' ? payload.status : '已保存');
      }
      if (message.type === 'error') setStatus(typeof payload?.message === 'string' ? payload.message : '保存失败');
    };
    window.addEventListener('message', listener); return () => window.removeEventListener('message', listener);
  }, []);

  const save = () => postMessage('saveAiSettings', { value: { ...state, apiKey } });
  const toggleApiKey = () => {
    if (showApiKey) { setShowApiKey(false); return; }
    if (apiKey) { setShowApiKey(true); return; }
    if (!state.hasApiKey || loadingApiKey) return;
    setLoadingApiKey(true); postMessage('requestAiKey', {});
  };
  return <PageShell title="AI 助手配置" dirty={dirty} valid={valid} onSave={save}>
    <div className="settings-page">
      <SettingsSection title="模型服务">
        <TextRow label="API 地址" value={state.baseUrl} type="url" placeholder="https://api.openai.com/v1" onChange={(value) => set('baseUrl', value)} />
        <TextRow label="模型" value={state.model} placeholder="gpt-5.6" onChange={(value) => set('model', value)} />
        <SelectRow label="API 协议" value={state.apiMode} options={[
          { value: 'responses', label: 'Responses API（OpenAI 推荐）' },
          { value: 'chat-completions', label: 'Chat Completions（兼容网关）' },
        ]} onChange={(value) => set('apiMode', value as AiSettingsState['apiMode'])} />
      </SettingsSection>
      <SettingsSection title="访问密钥">
        <label className="setting-row"><span>API 密钥</span><span className="secret-input">
          <input aria-label="API 密钥" value={apiKey} type={showApiKey ? 'text' : 'password'} autoComplete="new-password"
            placeholder={state.hasApiKey ? '••••••••••••••••' : '请输入 API 密钥'}
            onChange={(event) => { setApiKey(event.target.value); setDirty(true); setStatus(''); }} />
          <button className="icon-button" type="button" disabled={loadingApiKey || (!apiKey && !state.hasApiKey)}
            title={showApiKey ? '隐藏 API 密钥' : '显示 API 密钥'} aria-label={showApiKey ? '隐藏 API 密钥' : '显示 API 密钥'} onClick={toggleApiKey}>
            <i className={`codicon codicon-${showApiKey ? 'eye-closed' : 'eye'}`} aria-hidden="true" />
          </button>
        </span></label>
        <div className="setting-row"><span>密钥状态</span><span className="inline-actions"><span>{state.hasApiKey ? '已配置' : '未配置'}</span><button className="secondary" type="button" disabled={!state.hasApiKey} onClick={() => postMessage('deleteAiKey', {})}>删除密钥</button></span></div>
      </SettingsSection>
      <SettingsSection title="股票分析">
        <SelectRow label="历史数据范围" value={state.historyRange} options={[
          { value: '1w', label: '1 周' }, { value: '1m', label: '1 个月' }, { value: '3m', label: '3 个月' },
          { value: '6m', label: '6 个月' }, { value: '1y', label: '1 年' },
        ]} onChange={(value) => set('historyRange', value as AiSettingsState['historyRange'])} />
      </SettingsSection>
      <footer className="settings-actions"><span>{status}</span></footer>
    </div>
  </PageShell>;
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return <section className="settings-section"><h2>{title}</h2><fieldset>{children}</fieldset></section>;
}

function TextRow({ label, value, onChange, ...input }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; autoComplete?: string;
}): ReactElement {
  return <label className="setting-row"><span>{label}</span><input {...input} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function validBaseUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
  } catch { return false; }
}
