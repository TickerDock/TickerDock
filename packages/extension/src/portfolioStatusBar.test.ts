import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSONALIZATION } from './personalizationModel';

const mocked = vi.hoisted(() => ({
  items: [] as Array<{
    text: string;
    tooltip: string;
    color: string | undefined;
    name: string;
    command: string;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('vscode', () => ({
  StatusBarAlignment: { Left: 1 },
  window: {
    createStatusBarItem: () => {
      const item = {
        text: '', tooltip: '', color: undefined, name: '', command: '',
        show: vi.fn(), hide: vi.fn(), dispose: vi.fn(),
      };
      mocked.items.push(item);
      return item;
    },
  },
}));

import { PortfolioStatusBar } from './portfolioStatusBar';

describe('portfolio status bar', () => {
  it('renders stock and fund summaries with their custom templates', () => {
    mocked.items.length = 0;
    const bar = new PortfolioStatusBar();
    bar.setPersonalization({
      ...DEFAULT_PERSONALIZATION,
      stockPortfolioTemplate: '${name} ${marketValue} ${totalProfit} ${totalPercent}',
      fundPortfolioTemplate: '${name} ${todayProfit} ${todayPercent}',
    });
    const profit = {
      code: 'sh600000', name: 'Example', marketValue: 1250.5, costBasis: 1000,
      totalProfit: 250.5, totalReturnRatio: 0.2505, todayProfit: -12.3,
      todayReturnRatio: -0.0098, realized: false, currency: 'CNY' as const,
    };

    bar.updateStocks([profit]);
    bar.updateFunds([profit]);

    expect(mocked.items[0]?.text).toBe('股票 1250.50 +250.50 +25.05%');
    expect(mocked.items[1]?.text).toBe('基金 -12.30 -0.97%');
  });
});
