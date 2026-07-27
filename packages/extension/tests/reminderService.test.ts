import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: { showWarningMessage: vi.fn() },
}));

import { ReminderService } from '../src/reminderService';

const quote = (code: string) => ({
  code, name: code, market: 'sh' as const, price: 10, previousClose: 9,
  high: 11, low: 9, change: 1, changeRatio: 0.1,
  source: 'fixture', status: 'live' as const,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reminder service persistence', () => {
  it('does not persist quote snapshots when no reminders are configured', async () => {
    vi.useFakeTimers();
    const update = vi.fn(async (_key: string, _value: unknown) => undefined);
    const service = new ReminderService({
      getStockReminders: () => new Map(),
      getRemindersEnabled: () => true,
    } as never, { get: () => undefined, update } as never);

    await service.process([quote('SH600000')]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(update).not.toHaveBeenCalled();
    service.dispose();
  });

  it('persists snapshots only for stocks with active reminder rules', async () => {
    vi.useFakeTimers();
    const update = vi.fn(async (_key: string, _value: unknown) => undefined);
    const service = new ReminderService({
      getStockReminders: () => new Map([['SH600000', [{
        kind: 'price' as const, direction: 'above' as const, threshold: 20,
      }]]]),
      getRemindersEnabled: () => true,
    } as never, { get: () => undefined, update } as never);

    await service.process([quote('SH600000'), quote('SH600001')]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[1]).toMatchObject({
      previous: [{ code: 'SH600000' }],
    });
    service.dispose();
  });
});
