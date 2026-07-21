import { describe, expect, it } from 'vitest';
import { chartElement } from './chartPage';

describe('chart page embedding', () => {
  it('serializes chart options as inert escaped JSON', () => {
    const html = chartElement('chart', { series: [{ name: '</script><script>bad()</script>', data: [1] }] }, '<Chart>');
    expect(html).toContain('type="application/json"');
    expect(html).toContain('\\u003c/script>');
    expect(html).toContain('aria-label="&lt;Chart&gt;"');
    expect(html).not.toContain('</script><script>bad()');
  });
});
