import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FundComparisonPage } from '../../src/pages/FundComparisonPage';

const postMessage = vi.hoisted(() => vi.fn());
vi.mock('../../src/protocol', async () => ({ ...(await vi.importActual<typeof import('../../src/protocol')>('../../src/protocol')), postMessage }));

describe('fund comparison page', () => {
  afterEach(() => { cleanup(); postMessage.mockReset(); });
  it('renders normalized comparison data and range controls', () => {
    render(<FundComparisonPage series={[{ code: '001', name: '示例基金', data: [{ date: '2026-01-01', nav: 1, accumulatedNav: 1, source: 'fixture' }, { date: '2026-02-01', nav: 1.1, accumulatedNav: 1.1, source: 'fixture' }] }]} failedCodes={[]} controls={[{ id: '1y', label: '1Y' }]} active="1y" />);
    expect(screen.getByText('示例基金')).toBeInTheDocument();
    expect(screen.getByText('+10.00%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '基金标准化业绩对比图' })).toBeInTheDocument();
  });
  it('posts a validated range request from the control', () => {
    render(<FundComparisonPage failedCodes={[]} controls={[{ id: '1m', label: '1M' }]} active="1m" />);
    screen.getByRole('button', { name: '1M' }).click();
    expect(postMessage).toHaveBeenCalledWith('changeFundComparisonRange', { range: '1m' });
  });
});


