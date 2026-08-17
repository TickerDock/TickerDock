import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { PageShell } from '../components/PageShell';
import { SelectRow, TemplateRow, ToggleRow } from '../components/SettingsControls';
import { StatusBarStocksDialog } from '../components/StatusBarStocksDialog';
import type { PersonalizationState } from '../protocol';
import { postMessage, PROTOCOL_VERSION } from '../protocol';

export function PersonalizationPage({ initial, defaults }: { initial: PersonalizationState; defaults: PersonalizationState }): ReactElement {
  const [state, setState] = useState(() => clone(initial));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [showStocks, setShowStocks] = useState(false);
  const set = <K extends keyof PersonalizationState>(key: K, value: PersonalizationState[K]) => {
    setState((current) => ({ ...current, [key]: value })); setDirty(true); setStatus('');
  };
  const valid = templatesValid(state) && /^#[0-9a-f]{6}$/i.test(state.riseColor) && /^#[0-9a-f]{6}$/i.test(state.fallColor);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data as Record<string, unknown> | undefined;
      if (!message || message.version !== PROTOCOL_VERSION || typeof message.type !== 'string') return;
      const payload = message.payload as Record<string, unknown> | undefined;
      if (message.type === 'personalizationState' && payload?.state) { setState(clone(payload.state as PersonalizationState)); setDirty(false); setStatus('已恢复默认设置'); }
      if (message.type === 'personalizationSaved') { if (payload?.state) setState(clone(payload.state as PersonalizationState)); setDirty(false); setStatus('已保存'); }
      if (message.type === 'statusBarStocksSaved') setStatus('状态栏股票已保存');
      if (message.type === 'error') setStatus(typeof payload?.message === 'string' ? payload.message : '保存失败');
    };
    window.addEventListener('message', listener); return () => window.removeEventListener('message', listener);
  }, []);

  return <PageShell title="个性化设置" dirty={dirty} valid={valid} onSave={() => postMessage('savePersonalization', { value: state })}>
    <div className="settings-page">
      <SettingsSection title="侧边栏">
        <SelectRow label="显示模式" value={state.sidebarDisplayMode} options={[{ value: 'standard', label: '标准' }, { value: 'template', label: '自定义模板' }]} onChange={(value) => set('sidebarDisplayMode', value as PersonalizationState['sidebarDisplayMode'])} />
        <SelectRow label="涨跌图标" value={state.changeIconStyle} options={iconOptions} onChange={(value) => set('changeIconStyle', value as PersonalizationState['changeIconStyle'])} />
        <ToggleRow label="突出显示持仓股票" checked={state.heldStockHighlightEnabled} onChange={(value) => set('heldStockHighlightEnabled', value)} />
      </SettingsSection>
      <SettingsSection title="标签模板" disabled={state.sidebarDisplayMode !== 'template'}>
        <TemplateRow label="股票标签" value={state.stockLabelTemplate} defaultValue={defaults.stockLabelTemplate} title="可用变量：icon、name、code、price、percent、change、earnings" onChange={(value) => set('stockLabelTemplate', value)} />
        <TemplateRow label="基金标签" value={state.fundLabelTemplate} defaultValue={defaults.fundLabelTemplate} title="可用变量：icon、name、code、nav、percent、earnings、time" onChange={(value) => set('fundLabelTemplate', value)} />
      </SettingsSection>
      <SettingsSection title="状态栏">
        <TemplateRow label="行情标签" value={state.statusBarLabelTemplate} defaultValue={defaults.statusBarLabelTemplate} title="可用变量：icon、name、code、price、percent、change" onChange={(value) => set('statusBarLabelTemplate', value)} />
        <TemplateRow label="股票收益" value={state.stockPortfolioTemplate} defaultValue={defaults.stockPortfolioTemplate} title="可用变量：currency、marketValue、costBasis、totalProfit、totalPercent、todayProfit、todayPercent、warning" onChange={(value) => set('stockPortfolioTemplate', value)} />
        <TemplateRow label="基金收益" value={state.fundPortfolioTemplate} defaultValue={defaults.fundPortfolioTemplate} title="可用变量：currency、marketValue、costBasis、totalProfit、totalPercent、todayProfit、todayPercent、warning" onChange={(value) => set('fundPortfolioTemplate', value)} />
        <ToggleRow label="显示图标" checked={state.showStatusBarIcons} onChange={(value) => set('showStatusBarIcons', value)} />
        <ToggleRow label="行情状态栏" checked={state.showMarketStatusBar} onChange={(value) => set('showMarketStatusBar', value)} />
        <ToggleRow label="股票持仓状态栏" checked={state.showStockPortfolioStatusBar} onChange={(value) => set('showStockPortfolioStatusBar', value)} />
        <ToggleRow label="基金持仓状态栏" checked={state.showFundPortfolioStatusBar} onChange={(value) => set('showFundPortfolioStatusBar', value)} />
        <SelectRow label="行情刷新频率" value={String(state.marketStatusBarInterval)} options={refreshIntervalOptions} onChange={(value) => set('marketStatusBarInterval', Number(value))} />
        <SelectRow label="持仓刷新频率" value={String(state.portfolioStatusBarInterval)} options={refreshIntervalOptions} onChange={(value) => set('portfolioStatusBarInterval', Number(value))} />
        <div className="setting-row"><span>状态栏股票</span><button className="secondary" type="button" onClick={() => setShowStocks(true)}>{state.statusBarStocks.length} / 8　配置</button></div>
        <ToggleRow label="自定义涨跌颜色" checked={state.useCustomStatusBarColors} onChange={(value) => set('useCustomStatusBarColors', value)} />
        <div className="setting-row"><span>涨跌颜色</span><span className="color-inputs"><label><input type="color" value={state.riseColor} aria-label="上涨颜色" onChange={(event) => set('riseColor', event.target.value)} />上涨</label><label><input type="color" value={state.fallColor} aria-label="下跌颜色" onChange={(event) => set('fallColor', event.target.value)} />下跌</label></span></div>
      </SettingsSection>
      <SettingsSection title="行为">
        <SelectRow label="K 线默认模式" value={state.stockChartMode} options={[{ value: 'standard', label: '常规' }, { value: 'chips', label: '筹码分布' }]} onChange={(value) => set('stockChartMode', value as PersonalizationState['stockChartMode'])} />
        <ToggleRow label="股票提醒" checked={state.remindersEnabled} onChange={(value) => set('remindersEnabled', value)} />
        <ToggleRow label="仅交易时段自动刷新" checked={state.marketHoursEnabled} onChange={(value) => set('marketHoursEnabled', value)} />
      </SettingsSection>
      <footer className="settings-actions"><span>{status}</span><button className="secondary" type="button" onClick={() => postMessage('resetPersonalization', {})}><i className="codicon codicon-discard" />恢复默认</button></footer>
    </div>
    {showStocks && <StatusBarStocksDialog available={state.availableStocks} initial={state.statusBarStocks} onCancel={() => setShowStocks(false)} onSave={(codes) => { setState((current) => ({ ...current, statusBarStocks: codes })); setShowStocks(false); postMessage('saveStatusBarStocks', { value: codes }); }} />}
  </PageShell>;
}

function SettingsSection({ title, disabled, children }: { title: string; disabled?: boolean; children: ReactNode }): ReactElement {
  return <section className="settings-section" aria-disabled={disabled || undefined}><h2>{title}</h2><fieldset disabled={disabled}>{children}</fieldset></section>;
}

function clone(value: PersonalizationState): PersonalizationState { return { ...value, statusBarStocks: [...value.statusBarStocks], availableStocks: [...value.availableStocks] }; }
function templatesValid(value: PersonalizationState): boolean { return [value.stockLabelTemplate, value.fundLabelTemplate, value.statusBarLabelTemplate, value.stockPortfolioTemplate, value.fundPortfolioTemplate].every((template) => template.length > 0 && template.length <= 240); }
const iconOptions = [{ value: 'arrow', label: '箭头' }, { value: 'arrow1', label: '反色箭头' }, { value: 'food1', label: '食物 1' }, { value: 'food2', label: '食物 2' }, { value: 'food3', label: '食物 3' }, { value: 'iconfood', label: 'Emoji 食物' }, { value: 'none', label: '无图标' }];
const refreshIntervalOptions = [
  { value: '3000', label: '3 秒' }, { value: '5000', label: '5 秒' },
  { value: '10000', label: '10 秒' }, { value: '15000', label: '15 秒' },
  { value: '30000', label: '30 秒' }, { value: '60000', label: '60 秒' },
];
