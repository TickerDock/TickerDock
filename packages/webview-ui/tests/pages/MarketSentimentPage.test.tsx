import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarketSentimentPage } from '../../src/pages/MarketSentimentPage';

describe('market sentiment page', () => {
  afterEach(cleanup);
  it('renders breadth, themes and flow chart', () => {
    render(<MarketSentimentPage snapshot={{ breadth: { time: '2026-07-21', rising: 10, falling: 5, unchanged: 1, limitUp: 2, naturalLimitUp: 1, limitDown: 0, distribution: { limitUp: 2, aboveFive: 2, upOneToFive: 3, upZeroToOne: 3, flat: 1, downZeroToOne: 2, downOneToFive: 2, belowFive: 1, limitDown: 0 } }, hotThemes: [{ code: 'x', name: '人工智能', changeRatio: .02, leadingStockCode: '600000', leadingStockName: '浦发银行', leadingStockChangeRatio: .03 }], stockConnectFlow: [{ time: '10:00', shanghaiNetInflowYi: 1, shenzhenNetInflowYi: 2, northboundNetInflowYi: 3 }] }} />);
    expect(screen.getByText('牛熊风向标')).toBeInTheDocument();
    expect(screen.getByText('人工智能')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '沪深港通净流入折线图' })).toBeInTheDocument();
  });
  it('shows empty flow state', () => {
    render(<MarketSentimentPage snapshot={{ hotThemes: [], stockConnectFlow: [] }} />);
    expect(screen.getByText('暂无有效的沪深港通资金流数据。')).toBeInTheDocument();
  });
});


