import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { App } from '../src/App';
import { postMessage } from '../src/protocol';
import type { PersonalizationState } from '../src/protocol';

vi.mock('../src/protocol', async () => ({
  ...(await vi.importActual<typeof import('../src/protocol')>('../src/protocol')),
  postMessage: vi.fn(),
}));

describe('webview UI', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('adds a sector and marks the page dirty', async () => {
    render(<App bootstrap={{ page: 'sectorManager', sectors: [] }} />);
    await userEvent.click(screen.getByRole('button', { name: /添加板块/ }));
    expect(screen.getByPlaceholderText('BK0815')).toBeInTheDocument();
    expect(screen.getByText('未保存')).toBeInTheDocument();
  });

  it('validates and saves sectors through the versioned protocol helper', async () => {
    render(<App bootstrap={{ page: 'sectorManager', sectors: [] }} />);
    await userEvent.click(screen.getByRole('button', { name: /添加板块/ }));
    const save = screen.getByRole('button', { name: /保存/ });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText('板块代码'), 'BK0815');
    await userEvent.type(screen.getByLabelText('板块名称'), '昨日涨停');
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveSectors', {
      sectors: [{ code: 'BK0815', name: '昨日涨停' }],
    });
  });

  it('edits and saves a stock position', async () => {
    render(<App bootstrap={{
      page: 'stockPositions',
      items: [{ code: 'sh600000', name: '浦发银行' }],
      positions: [{ code: 'sh600000', quantity: 100, costPrice: 10, soldOut: false }],
    }} />);
    const quantity = screen.getAllByRole('spinbutton')[0]!;
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '200');
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveStockPositions', {
      positions: [{ code: 'sh600000', quantity: 200, costPrice: 10, soldOut: false }],
    });
  });

  it('adds and saves a new stock position with an unchecked sold-out state', async () => {
    render(<App bootstrap={{
      page: 'stockPositions',
      items: [{ code: 'sh600000', name: '娴﹀彂閾惰' }],
      positions: [],
    }} />);
    await userEvent.type(screen.getAllByRole('spinbutton')[0]!, '200');
    await userEvent.type(screen.getAllByRole('spinbutton')[1]!, '10');
    const save = screen.getByRole('button', { name: '保存' });
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveStockPositions', {
      positions: [{ code: 'sh600000', quantity: 200, costPrice: 10, soldOut: false }],
    });
  });

  it('keeps save actionable and identifies an incomplete position row', async () => {
    render(<App bootstrap={{
      page: 'stockPositions',
      items: [{ code: 'sh600000', name: '浦发银行' }],
      positions: [],
    }} />);
    await userEvent.type(screen.getAllByRole('spinbutton')[0]!, '200');
    const save = screen.getByRole('button', { name: '保存' });
    expect(save).toBeEnabled();

    await userEvent.click(save);
    expect(screen.getByRole('alert')).toHaveTextContent('请完成标记的必填项');
    expect(screen.getAllByRole('spinbutton')[1]).toHaveAttribute('aria-invalid', 'true');
    expect(vi.mocked(postMessage)).not.toHaveBeenCalledWith('saveStockPositions', expect.anything());

    await userEvent.type(screen.getAllByRole('spinbutton')[1]!, '10');
    await userEvent.click(save);
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveStockPositions', {
      positions: [{ code: 'sh600000', quantity: 200, costPrice: 10, soldOut: false }],
    });
  });

  it('accepts zero as clearing the optional stock trade price override', async () => {
    render(<App bootstrap={{
      page: 'stockPositions',
      items: [{ code: 'sh600000', name: '浦发银行' }],
      positions: [{ code: 'sh600000', quantity: 100, costPrice: 10, soldOut: false }],
    }} />);
    await userEvent.type(screen.getAllByRole('spinbutton')[2]!, '0');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveStockPositions', {
      positions: [{ code: 'sh600000', quantity: 100, costPrice: 10, todayTradePrice: 0, soldOut: false }],
    });
  });

  it('adds and saves a new fund position', async () => {
    render(<App bootstrap={{
      page: 'fundPositions',
      items: [{ code: '110022', name: '鏄撴柟杈炬秷璐?' }],
      positions: [],
    }} />);
    await userEvent.type(screen.getAllByRole('spinbutton')[0]!, '1000');
    await userEvent.type(screen.getAllByRole('spinbutton')[1]!, '1.5');
    const save = screen.getByRole('button', { name: '保存' });
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveFundPositions', {
      positions: [{ code: '110022', shares: 1000, costNav: 1.5 }],
    });
  });

  it('clears a fund position without removing the asset row', async () => {
    render(<App bootstrap={{
      page: 'fundPositions',
      items: [{ code: '110022', name: '易方达消费' }],
      positions: [{ code: '110022', shares: 1000, costNav: 1.5 }],
    }} />);
    await userEvent.click(screen.getByRole('button', { name: '清空 易方达消费 持仓' }));
    expect(screen.getByText('易方达消费')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveFundPositions', { positions: [] });
  });

  it('renders and saves the personalization page', async () => {
    const state = personalizationState();
    render(<App bootstrap={{ page: 'personalization', state, defaults: state }} />);
    await userEvent.selectOptions(screen.getByLabelText('显示模式'), 'template');
    await userEvent.selectOptions(screen.getByLabelText('行情刷新频率'), '5000');
    await userEvent.click(screen.getByRole('button', { name: /^保存$/ }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('savePersonalization', {
      value: { ...state, sidebarDisplayMode: 'template', marketStatusBarInterval: 5000 },
    });
  });

  it('renders and saves the standalone AI settings page', async () => {
    render(<App bootstrap={{ page: 'aiSettings', state: {
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.6', apiMode: 'responses', historyRange: '6m', hasApiKey: true,
    } }} />);
    await userEvent.clear(screen.getByLabelText('模型'));
    await userEvent.type(screen.getByLabelText('模型'), 'gpt-5');
    await userEvent.selectOptions(screen.getByLabelText('历史数据范围'), '3m');
    await userEvent.click(screen.getByRole('button', { name: /^保存$/ }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveAiSettings', { value: {
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-5', apiMode: 'responses', historyRange: '3m', hasApiKey: true, apiKey: '',
    } });
  });

  it('reveals and hides the stored AI key on demand', async () => {
    render(<App bootstrap={{ page: 'aiSettings', state: {
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.6', apiMode: 'responses', historyRange: '6m', hasApiKey: true,
    } }} />);
    const keyInput = screen.getByLabelText('API 密钥');
    expect(keyInput).toHaveAttribute('type', 'password');
    expect(keyInput).toHaveAttribute('placeholder', '••••••••••••••••');
    await userEvent.click(screen.getByRole('button', { name: '显示 API 密钥' }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('requestAiKey', {});
    window.dispatchEvent(new MessageEvent('message', { data: {
      version: 1, type: 'aiKeyLoaded', payload: { apiKey: 'sk-secret' }, requestId: 'test',
    } }));
    await waitFor(() => expect(keyInput).toHaveAttribute('type', 'text'));
    expect(keyInput).toHaveValue('sk-secret');
    await userEvent.click(screen.getByRole('button', { name: '隐藏 API 密钥' }));
    expect(keyInput).toHaveAttribute('type', 'password');
  });

  it('saves status bar stock selection separately', async () => {
    const state = personalizationState();
    render(<App bootstrap={{ page: 'personalization', state, defaults: state }} />);
    await userEvent.click(screen.getByRole('button', { name: /配置/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /浦发银行/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: /^保存$/ }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('saveStatusBarStocks', {
      value: ['sh000001', 'sh600000'],
    });
  });

  it('renders trusted research links through the Host protocol', async () => {
    render(<App bootstrap={{ page: 'stockResearch', name: '浦发银行', items: [{
      id: 'article-1', title: '研报标题', summary: '研报摘要', time: '2026-07-21', source: 'jiuyangongshe',
      url: 'https://www.jiuyangongshe.com/a/article-1',
    }] }} />);
    expect(screen.getByRole('heading', { level: 1, name: '浦发银行' })).toBeInTheDocument();
    expect(screen.getByText('研报标题')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /打开原文/ }));
    expect(vi.mocked(postMessage)).toHaveBeenCalledWith('openResearchUrl', { url: 'https://www.jiuyangongshe.com/a/article-1' });
  });

  it('renders structured fund details without HTML string interpolation', () => {
    render(<App bootstrap={{ page: 'fundDetail', title: '基金详情', detail: {
      code: '001632', name: '<示例基金>', fundType: '指数型', riskLevel: '中高风险',
      sizeCny: 3_985_000_000, sizeDate: '2026-03-31', manager: '基金经理',
      returns: { month: 0.0096, year: -0.1568 }, profitProbability: { week: 0.4085 },
      institutionRatings: [{ date: '2026-03-31', merchantSecurities: 4 }],
      similarFunds: [{ code: '008326', name: '同类基金', period: '1Y', returnRatio: 0.216 }],
      holdings: [{ code: '600519', name: '贵州茅台', navRatio: 0.099, sharesWan: 1, marketValueWan: 2, reportDate: '2026-03-31' }],
    } }} />);
    expect(screen.getByRole('heading', { name: '<示例基金>' })).toBeInTheDocument();
    expect(screen.getByText('39.85 B CNY (2026-03-31)')).toBeInTheDocument();
    expect(screen.getByText('贵州茅台')).toBeInTheDocument();
  });
});

function personalizationState(): PersonalizationState {
  return {
    sidebarDisplayMode: 'standard', changeIconStyle: 'arrow',
    stockLabelTemplate: '${name}', fundLabelTemplate: '${name}', statusBarLabelTemplate: '${name}',
    stockPortfolioTemplate: '${totalProfit}', fundPortfolioTemplate: '${totalProfit}',
    useCustomStatusBarColors: false, riseColor: '#e05252', fallColor: '#3fa66b',
    heldStockHighlightEnabled: true, remindersEnabled: true, marketHoursEnabled: true,
    stockChartMode: 'standard', showMarketStatusBar: true, showStockPortfolioStatusBar: true,
    showFundPortfolioStatusBar: true, showStatusBarIcons: true, statusBarStocks: ['sh000001'],
    marketStatusBarInterval: 15000, portfolioStatusBarInterval: 15000,
    availableStocks: [{ code: 'sh000001', name: '上证指数' }, { code: 'sh600000', name: '浦发银行' }],
  };
}


