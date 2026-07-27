import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BinanceFramePage } from '../../src/pages/BinanceFramePage';

describe('Binance frame page', () => {
  afterEach(cleanup);
  it('renders the TradingView iframe in the React page', () => {
    const source = 'https://s.tradingview.com/widgetembed/?hideideas=1#options';
    render(<BinanceFramePage title="BTC/USDT" source={source} />);
    const frame = screen.getByTitle('BTC/USDT');
    expect(frame).toHaveAttribute('src', source);
    expect(frame).toHaveAttribute('allow', 'fullscreen');
    expect(frame).not.toHaveAttribute('sandbox');
  });
});


