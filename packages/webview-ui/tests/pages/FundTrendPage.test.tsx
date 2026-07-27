import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FundTrendPage } from '../../src/pages/FundTrendPage';

const postMessage = vi.hoisted(() => vi.fn());
vi.mock('../../src/protocol', async () => ({ ...(await vi.importActual<typeof import('../../src/protocol')>('../../src/protocol')), postMessage }));

describe('fund trend page', () => {
  afterEach(() => { cleanup(); postMessage.mockReset(); });
  it('renders NAV lines, summary and history', () => {
    render(<FundTrendPage title="示例基金走势" data={[{ date: '2026-01-01', nav: 1, accumulatedNav: 1.5, source: 'fixture' }, { date: '2026-07-01', nav: 1.2, accumulatedNav: 1.8, source: 'fixture' }]} controls={[{ id: '1y', label: '1Y' }]} active="1y" />);
    expect(screen.getByText('+20.00%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '基金净值走势' })).toBeInTheDocument();
    expect(screen.getAllByText('fixture')).toHaveLength(2);
  });
  it('posts a versioned range action through the protocol helper', () => {
    render(<FundTrendPage title="走势" controls={[{ id: 'all', label: 'All' }]} active="all" />);
    screen.getByRole('button', { name: 'All' }).click();
    expect(postMessage).toHaveBeenCalledWith('changeFundTrendRange', { range: 'all' });
  });
});


