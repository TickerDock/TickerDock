import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { LeekCenterPage } from '../../src/pages/LeekCenterPage';

const postMessage = vi.hoisted(() => vi.fn());
vi.mock('../../src/protocol', async () => ({ ...(await vi.importActual<typeof import('../../src/protocol')>('../../src/protocol')), postMessage }));
const pages = [{ id: 'bull-bear', title: '选股通盯盘', description: '', group: 'Market' as const, url: 'https://xuangutong.com.cn/dingpan' }, { id: 'wind-vane', title: '股票风向标', description: '市场情绪', group: 'Market' as const, url: 'http://localhost:16100/zhuti/#ggfxb' }];

describe('Leek Center page', () => {
  afterEach(() => { cleanup(); postMessage.mockReset(); });
  it('renders data-center navigation and proxied iframe pages', async () => {
    render(<LeekCenterPage pages={pages} initialPageId="wind-vane" initialWatchlist={{ stocks: [], funds: [], updatedAt: 1 }} />);
    expect(screen.getByTitle('行情中心数据页面')).toHaveAttribute('src', 'http://localhost:16100/zhuti/#ggfxb');
    await userEvent.click(screen.getByRole('button', { name: /选股通盯盘/ }));
    expect(screen.getByTitle('行情中心数据页面')).toHaveAttribute('src', 'https://xuangutong.com.cn/dingpan');
  });
  it('renders watchlist data and requests structured stock details', async () => {
    render(<LeekCenterPage pages={pages} initialPageId="bull-bear" initialWatchlist={{ stocks: [{ name: 'Stocks', items: [{ code: 'sh600000', name: 'Pudong Bank', market: 'sh', price: 10.25, previousClose: 10, open: 10.1, high: 10.5, low: 9.98, change: .25, changeRatio: .025, source: 'stock-api', status: 'live' }] }], funds: [], updatedAt: 1 }} />);
    await userEvent.click(screen.getAllByRole('button')[1]!);
    expect(screen.getAllByText('Pudong Bank').length).toBeGreaterThan(0);
    expect(postMessage).toHaveBeenCalledWith('loadLeekStockDetails', expect.objectContaining({ code: 'sh600000' }));
  });
});




