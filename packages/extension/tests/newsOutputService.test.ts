import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  appendLine: vi.fn(),
  outputShow: vi.fn(),
  statusShow: vi.fn(),
  statusHide: vi.fn(),
}));

vi.mock('vscode', () => ({
  StatusBarAlignment: { Right: 2 },
  window: {
    createOutputChannel: () => ({
      appendLine: mocks.appendLine,
      show: mocks.outputShow,
      dispose: vi.fn(),
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
  beforeEach(() => vi.clearAllMocks());

  it('backfills the current news when the output is opened', () => {
    const service = new NewsOutputService();
    service.process(news);
    expect(mocks.appendLine).not.toHaveBeenCalled();
    service.show();
    expect(mocks.appendLine).toHaveBeenCalledOnce();
    expect(mocks.appendLine.mock.calls[0]![0]).toContain('Market update');
  });

  it('backfills after refresh when the output was opened before data arrived', () => {
    const service = new NewsOutputService();
    service.show();
    service.process(news);
    expect(mocks.appendLine).toHaveBeenCalledOnce();
  });

  it('keeps an explicitly opened output channel live when background output is disabled', () => {
    const service = new NewsOutputService();
    service.process(news);
    service.show();
    service.process([...news, {
      ...news[0]!, id: '2', time: '2026-07-20T08:01:00Z', title: 'Second update',
    }]);
    expect(mocks.appendLine).toHaveBeenCalledTimes(2);
    expect(mocks.appendLine.mock.calls[1]![0]).toContain('Second update');
  });
});


