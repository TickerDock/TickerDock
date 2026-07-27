import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  postMessage: vi.fn(),
  panelReveal: vi.fn(),
  statusShow: vi.fn(),
  statusHide: vi.fn(),
  receiveMessage: undefined as ((message: unknown) => void) | undefined,
  disposePanel: undefined as (() => void) | undefined,
}));

vi.mock('vscode', () => ({
  EventEmitter: class<T> {
    private readonly listeners = new Set<(value: T) => void>();
    readonly event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T): void { this.listeners.forEach((listener) => listener(value)); }
    dispose(): void { this.listeners.clear(); }
  },
  StatusBarAlignment: { Right: 2 },
  ViewColumn: { Beside: 2 },
  Uri: { parse: (value: string) => ({ scheme: new URL(value).protocol.slice(0, -1) }) },
  env: { openExternal: vi.fn() },
  window: {
    createWebviewPanel: () => ({
      webview: {
        cspSource: 'test-source',
        html: '',
        postMessage: mocks.postMessage,
        onDidReceiveMessage: (listener: (message: unknown) => void) => {
          mocks.receiveMessage = listener;
          return { dispose: vi.fn() };
        },
      },
      reveal: mocks.panelReveal,
      onDidDispose: (listener: () => void) => {
        mocks.disposePanel = listener;
        return { dispose: vi.fn() };
      },
      dispose: () => mocks.disposePanel?.(),
    }),
    createStatusBarItem: () => ({
      show: mocks.statusShow,
      hide: mocks.statusHide,
      dispose: vi.fn(),
    }),
    showInformationMessage: vi.fn(),
  },
}));

import { NewsOutputService } from '../src/newsOutputService';

const news = [{
  id: '1', source: 'jin10', time: '2026-07-20T08:00:00Z', title: 'Market update',
  summary: 'Summary', important: false, kind: 'news' as const,
}];

describe('news output service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.receiveMessage = undefined;
    mocks.disposePanel = undefined;
  });

  it('buffers the first refresh until the console is ready', () => {
    const service = new NewsOutputService();
    service.show();
    service.process(news);
    expect(mocks.postMessage).not.toHaveBeenCalled();

    mocks.receiveMessage?.({ type: 'ready' });
    expect(mocks.postMessage).toHaveBeenCalledOnce();
    expect(mocks.postMessage.mock.calls[0]![0]).toMatchObject({ type: 'append', item: news[0] });
  });

  it('ignores refresh results after the console is closed', () => {
    const service = new NewsOutputService();
    service.show();
    mocks.receiveMessage?.({ type: 'ready' });
    mocks.disposePanel?.();
    service.process(news);
    expect(mocks.postMessage).not.toHaveBeenCalled();
  });

  it('reports open and close lifecycle changes', () => {
    const service = new NewsOutputService();
    const changes: boolean[] = [];
    service.onDidChangeOpen((open) => changes.push(open));

    service.show();
    service.show();
    expect(mocks.panelReveal).toHaveBeenCalledOnce();
    mocks.disposePanel?.();
    expect(changes).toEqual([true, false]);
  });
});
