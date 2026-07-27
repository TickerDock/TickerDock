import { describe, expect, it } from 'vitest';
import { renderIwenCaiTokenPage } from '../src/stockExtendedDetailPage';

describe('stock extended detail page', () => {
  it('loads the local token module with a nonce and restricted CSP source', () => {
    const html = renderIwenCaiTokenPage('Details', 'vscode-webview://id/assets/hexin-v.js', 'vscode-webview://id', 'fixed');
    expect(html).toContain("script-src 'nonce-fixed' vscode-webview://id");
    expect(html).toContain('import {getHexinToken}');
    expect(html).toContain("command:'iwencaiToken'");
  });
});


