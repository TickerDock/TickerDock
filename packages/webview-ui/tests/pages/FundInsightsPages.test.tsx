import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FundFlowsPage } from '../../src/pages/FundFlowsPage';
import { FundHoldingsPage } from '../../src/pages/FundHoldingsPage';
import { FundRankingPage } from '../../src/pages/FundRankingPage';

describe('fund insight pages', () => {
  afterEach(cleanup);

  it('renders fund holdings and report date', () => {
    render(<FundHoldingsPage code="001632" items={[{
      code: '600519', name: '贵州茅台', navRatio: 0.099, sharesWan: 1, marketValueWan: 2, reportDate: '2026-03-31',
    }]} />);
    expect(screen.getByText('报告日期：2026-03-31')).toBeInTheDocument();
    expect(screen.getByText('+9.90%')).toBeInTheDocument();
  });

  it('renders ranking periods', () => {
    render(<FundRankingPage items={[{
      code: '001632', name: '示例基金', nav: 1.25, navDate: '2026-07-21', dayReturnRatio: 0.01, yearReturnRatio: -0.12,
    }]} />);
    expect(screen.getByText('示例基金')).toBeInTheDocument();
    expect(screen.getByText('-12.00%')).toBeInTheDocument();
  });

  it('renders each fund-flow category', () => {
    render(<FundFlowsPage
      industry={[{ code: 'i1', name: '银行', netInflow: 200_000_000, category: 'industry' }]}
      concept={[{ code: 'c1', name: '人工智能', netInflow: -100_000_000, category: 'concept' }]}
      region={[]}
    />);
    expect(screen.getByText('银行')).toBeInTheDocument();
    expect(screen.getByText('人工智能')).toBeInTheDocument();
    expect(screen.getByText('2.00 B CNY')).toBeInTheDocument();
  });
});


