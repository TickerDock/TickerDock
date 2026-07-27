import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StockMarketFramePage } from '../../src/pages/StockMarketFramePage';

const postMessage = vi.hoisted(() => vi.fn());
vi.mock('../../src/protocol', async () => ({ ...(await vi.importActual<typeof import('../../src/protocol')>('../../src/protocol')), postMessage }));

describe('stock market frame page', () => {
  afterEach(() => { cleanup(); postMessage.mockReset(); });
  it('renders the proxied frame and changes chart mode', () => {
    render(<StockMarketFramePage title="贵州茅台" targets={{ standard: 'http://localhost:16100/basic/full.html?mcid=1.600519', chips: 'http://localhost:16100/basic/h5chart-iframe.html?code=600519&market=1' }} mode="standard" />);
    expect(screen.getByTitle('贵州茅台')).toHaveAttribute('src', expect.stringContaining('localhost:16100'));
    expect(screen.getByTitle('贵州茅台').parentElement).toHaveClass('eastmoney-detail-frame');
    screen.getByRole('button', { name: '筹码分布' }).click();
    expect(postMessage).toHaveBeenCalledWith('changeStockChartMode', { mode: 'chips' });
  });
  it('falls back to standard mode when chips are unavailable', () => {
    render(<StockMarketFramePage title="上证指数" targets={{ standard: 'http://localhost:16100/basic/full.html?mcid=1.000001' }} mode="chips" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTitle('上证指数')).toHaveAttribute('src', expect.stringContaining('mcid=1.000001'));
  });
  it('does not mark non-Eastmoney pages for inversion', () => {
    render(<StockMarketFramePage title="期货" targets={{ standard: 'https://finance.sina.com.cn/futures/quotes/ABC.shtml' }} mode="standard" />);
    expect(screen.getByTitle('期货').parentElement).not.toHaveClass('eastmoney-detail-frame');
  });
});


