import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FundOverviewPage } from '../../src/pages/FundOverviewPage';

const postMessage = vi.hoisted(() => vi.fn());
vi.mock('../../src/protocol', async () => ({ ...(await vi.importActual<typeof import('../../src/protocol')>('../../src/protocol')), postMessage }));

describe('fund overview page', () => {
  afterEach(() => { cleanup(); postMessage.mockReset(); });
  it('renders searchable quotes, estimates, history and ECharts', () => {
    render(<FundOverviewPage funds={[{ code: '001632', name: '示例基金', nav: 1.2, accumulatedNav: 1.8, navDate: '2026-07-16', navChangeRatio: .01, estimatedNav: 1.22, estimatedChangeRatio: .02, estimateTime: '2026-07-17 14:30', source: 'fund-api', status: 'live' }]} selectedCode="001632" range="1y" loading={false} history={[{ date: '2026-01-01', nav: 1, accumulatedNav: 1.5, source: 'fixture' }, { date: '2026-07-16', nav: 1.2, accumulatedNav: 1.8, source: 'fixture' }]} />);
    expect(screen.getByText('估算净值')).toBeInTheDocument();
    expect(screen.getByText('+20.00%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '基金净值走势' })).toBeInTheDocument();
  });
  it('posts selection and range changes', () => {
    render(<FundOverviewPage funds={[{ code: '001632', name: '示例基金', nav: 1, accumulatedNav: 1, navDate: '', source: 'fixture', status: 'live' }]} selectedCode="001632" range="1y" loading={false} history={[]} />);
    screen.getByRole('button', { name: '全部' }).click();
    expect(postMessage).toHaveBeenCalledWith('changeFundOverviewRange', { range: 'all' });
    screen.getByRole('button', { name: /示例基金/ }).click();
    expect(postMessage).toHaveBeenCalledWith('selectFundOverviewFund', { code: '001632' });
  });
});


