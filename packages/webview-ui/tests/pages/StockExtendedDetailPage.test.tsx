import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StockExtendedDetailPage } from '../../src/pages/StockExtendedDetailPage';

describe('stock extended detail page', () => {
  afterEach(cleanup);

  it('renders technical levels, diagnosis and reports', () => {
    render(<StockExtendedDetailPage title="股票详情" detail={{
      code: 'sh600519', name: '贵州茅台', changeRatio: 0.05,
      technical: { currentPrice: 105, movingAverage20: 102, movingAverage60: 99, support: 80, resistance: 115, takeProfit: 115, stopLoss: 80, sampleSize: 60 },
      iwencai: { diagnosis: { title: '强势', score: 8, short: '上涨', mid: '震荡', long: '上涨', content: '诊断内容' }, concepts: [{ title: '消费' }], heat: '100', institutionReports: [{ reportDate: '2026-03-31', rating: '买入', direction: '上调', targetPrice: '120', researcher: '研究员', iwencaiRating: 'A' }] },
      research: [], unavailableSources: [],
    }} />);
    expect(screen.getByRole('heading', { name: '贵州茅台' })).toBeInTheDocument();
    expect(screen.getByText('参考止盈')).toBeInTheDocument();
    expect(screen.getByText('消费')).toBeInTheDocument();
    expect(screen.getByText('诊断内容')).toBeInTheDocument();
  });
});


