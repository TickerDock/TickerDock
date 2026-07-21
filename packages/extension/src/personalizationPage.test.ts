import { describe, expect, it } from 'vitest';
import { DEFAULT_PERSONALIZATION } from './personalizationModel';
import { renderPersonalizationPage } from './personalizationPage';

describe('personalization page', () => {
  it('uses a nonce CSP and escapes template values', () => {
    const html = renderPersonalizationPage({
      ...DEFAULT_PERSONALIZATION,
      stockLabelTemplate: '<script>alert(1)</script>',
      heldStockHighlightEnabled: true,
      remindersEnabled: true,
      marketHoursEnabled: true,
      stockChartMode: 'standard',
      showMarketStatusBar: true,
      showStockPortfolioStatusBar: true,
      showFundPortfolioStatusBar: true,
      showStatusBarIcons: true,
      statusBarStocks: ['sh000001'],
      availableStocks: [{ code: 'sh000001', name: 'Shanghai Composite' }],
    }, 'test-nonce');
    expect(html).toContain("script-src 'nonce-test-nonce'");
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders searchable status bar stocks with draggable selected items', () => {
    const html = renderPersonalizationPage({
      ...DEFAULT_PERSONALIZATION,
      heldStockHighlightEnabled: true,
      remindersEnabled: true,
      marketHoursEnabled: true,
      stockChartMode: 'standard',
      showMarketStatusBar: true,
      showStockPortfolioStatusBar: true,
      showFundPortfolioStatusBar: true,
      showStatusBarIcons: true,
      statusBarStocks: ['sh600036', 'sh688256'],
      availableStocks: [
        { code: 'sh600036', name: 'China Merchants Bank' },
        { code: 'sh688256', name: 'Cambricon' },
      ],
    }, 'test-nonce');

    expect(html).toContain('id="configure-status-stocks"');
    expect(html).toContain('id="stock-modal"');
    expect(html).toContain('id="stock-search"');
    expect(html).toContain("chip.draggable=true");
    expect(html).toContain("output.statusBarStocks=selected");
    expect(html).toContain("type:'saveStatusBarStocks',value:selected");
    expect(html).toContain('data-template-reset="statusBarLabelTemplate"');
    expect(html).toContain('data-template-reset="stockPortfolioTemplate"');
    expect(html).toContain('&#21487;&#29992;&#21464;&#37327;');
    expect(html).toContain('sh600036');
  });
});
