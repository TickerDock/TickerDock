import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarketSentimentPage } from '../../src/pages/MarketSentimentPage';

const breadth = { time: '2026-07-21', rising: 10, falling: 5, unchanged: 1, limitUp: 2, naturalLimitUp: 1, limitDown: 0, distribution: { limitUp: 2, aboveFive: 2, upOneToFive: 3, upZeroToOne: 3, flat: 1, downZeroToOne: 2, downOneToFive: 2, belowFive: 1, limitDown: 0 } };

describe('market sentiment page', () => {
  afterEach(cleanup);
  it('renders breadth, themes and flow chart', () => {
    render(<MarketSentimentPage initialSnapshot={{ breadth, hotThemes: [{ code: 'x', name: '人工智能', changeRatio: .02, leadingStockCode: '600000', leadingStockName: '浦发银行', leadingStockChangeRatio: .03 }], marketFundFlow: [{ date: '2026-07-21', mainNetInflowYi: 1, superLargeNetInflowYi: 2, largeNetInflowYi: 3, mediumNetInflowYi: -2, smallNetInflowYi: -4 }], stockFundFlowRank: [{ code: '600000', name: '浦发银行', price: 12, changeRatio: .01, mainNetInflowYi: 2, mainNetInflowRatio: .03 }], sectorFundFlowRank: [{ code: 'BK0001', name: '银行', changeRatio: .02, mainNetInflowYi: 3, mainNetInflowRatio: .04, topStockCode: '600000', topStockName: '浦发银行' }] }} />);
    expect(screen.getByText('牛熊风向标')).toBeInTheDocument();
    expect(screen.getByText('人工智能')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '大盘资金流折线图' })).toBeInTheDocument();
    expect(screen.getByText('个股资金流排名')).toBeInTheDocument();
    expect(screen.getByText('板块资金流排名')).toBeInTheDocument();
  });
  it('shows empty flow state', () => {
    render(<MarketSentimentPage initialSnapshot={{ breadth, hotThemes: [], marketFundFlow: [], stockFundFlowRank: [], sectorFundFlowRank: [] }} />);
    expect(screen.getByText('暂无有效的大盘资金流数据。')).toBeInTheDocument();
  });

  it('updates each slow section independently', async () => {
    render(<MarketSentimentPage initialSnapshot={{ breadth }} initialLoadingSections={['hotThemes', 'marketFundFlow', 'stockFundFlowRank', 'sectorFundFlowRank']} />);
    expect(screen.getAllByText('正在加载数据...')).toHaveLength(4);

    act(() => window.dispatchEvent(new MessageEvent('message', { data: {
      version: 1, type: 'marketSentimentSection', payload: { section: 'hotThemes', value: [{
        code: 'theme', name: '机器人', changeRatio: .01,
        leadingStockCode: '600000', leadingStockName: '示例', leadingStockChangeRatio: .02,
      }] },
    } })));

    expect(await screen.findByText('机器人')).toBeInTheDocument();
    expect(screen.getAllByText('正在加载数据...')).toHaveLength(3);
  });
});


