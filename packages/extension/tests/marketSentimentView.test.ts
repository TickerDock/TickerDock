import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createWebviewPanel, postWebviewMessage } = vi.hoisted(() => ({
  createWebviewPanel: vi.fn(), postWebviewMessage: vi.fn(async () => true),
}));

vi.mock('vscode', () => ({
  ViewColumn: { One: 1 },
  window: { createWebviewPanel },
  Uri: { joinPath: vi.fn() },
}));

vi.mock('../src/webviewUi', () => ({
  renderWebviewUi: vi.fn((_webview, _extensionUri, bootstrap) => JSON.stringify(bootstrap)),
  webviewUiRoot: vi.fn(() => ({ path: '/webview' })),
  postWebviewMessage,
  readWebviewEnvelope: (message: { type?: string }, type: string) => message.type === type ? {} : undefined,
}));

import { showMarketSentiment } from '../src/marketSentimentView';

describe('market sentiment view', () => {
  beforeEach(() => {
    createWebviewPanel.mockReset();
    postWebviewMessage.mockClear();
  });

  it('reuses the active panel and creates another only after disposal', async () => {
    let dispose: (() => void) | undefined;
    let receive: ((message: unknown) => void) | undefined;
    const firstPanel = {
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn((listener: (message: unknown) => void) => {
          receive = listener;
          return { dispose: vi.fn() };
        }),
      },
      reveal: vi.fn(),
      onDidDispose: vi.fn((listener: () => void) => { dispose = listener; }),
    };
    const secondPanel = {
      webview: { html: '', onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })) },
      reveal: vi.fn(),
      onDidDispose: vi.fn(),
    };
    createWebviewPanel.mockReturnValueOnce(firstPanel).mockReturnValueOnce(secondPanel);
    const gateway = {
      getSnapshot: vi.fn(),
      getBreadth: vi.fn(async () => ({
        time: '2026-07-27', rising: 1, falling: 1, unchanged: 0,
        limitUp: 0, naturalLimitUp: 0, limitDown: 0,
        distribution: { limitUp: 0, aboveFive: 0, upOneToFive: 1, upZeroToOne: 0, flat: 0, downZeroToOne: 0, downOneToFive: 1, belowFive: 0, limitDown: 0 },
      })),
      getHotThemes: vi.fn(async () => []),
      getMarketFundFlow: vi.fn(async () => []),
      getStockFundFlowRank: vi.fn(async () => []),
      getSectorFundFlowRank: vi.fn(async () => []),
    };
    const extensionUri = { path: '/extension' } as never;

    await showMarketSentiment(gateway, extensionUri);
    await showMarketSentiment(gateway, extensionUri);

    expect(createWebviewPanel).toHaveBeenCalledTimes(1);
    expect(firstPanel.reveal).toHaveBeenCalledWith(1);
    expect(gateway.getBreadth).toHaveBeenCalledTimes(2);

    receive?.({ type: 'marketSentimentReady' });
    await vi.waitFor(() => expect(postWebviewMessage).toHaveBeenCalledTimes(4));
    expect(gateway.getHotThemes).toHaveBeenCalledOnce();

    dispose?.();
    await showMarketSentiment(gateway, extensionUri);
    expect(createWebviewPanel).toHaveBeenCalledTimes(2);
  });
});
