import { describe, expect, it } from 'vitest';
import { renderStockResearchPage } from './stockResearchPage';

describe('stock research page', () => {
  it('escapes provider text and keeps only the normalized article URL', () => {
    const html = renderStockResearchPage('Example <Stock>', [{
      id: 'abc', title: '<script>alert(1)</script>', summary: '<img src=x>',
      time: '2026-07-17 08:00:00', source: 'jiuyangongshe',
      url: 'https://www.jiuyangongshe.com/a/abc',
    }]);
    expect(html).toContain('Example &lt;Stock&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('https://www.jiuyangongshe.com/a/abc');
  });

  it('does not render an unexpected provider destination', () => {
    const html = renderStockResearchPage('Example', [{
      id: 'abc', title: 'Title', summary: 'Summary', time: '', source: 'test',
      url: 'javascript:alert(1)',
    }]);
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('Open original article');
  });
});
