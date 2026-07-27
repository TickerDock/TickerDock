import { afterEach, describe, expect, it, vi } from 'vitest';
import { RefreshController } from '../src/refreshController';

afterEach(() => {
  vi.useRealTimers();
});

describe('RefreshController', () => {
  it('runs immediately and then at the configured interval', async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    const controller = new RefreshController(5000, task);

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('stops scheduled work when disposed', async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    const controller = new RefreshController(5000, task);

    controller.start();
    controller.dispose();
    await vi.advanceTimersByTimeAsync(10000);

    expect(task).not.toHaveBeenCalled();
  });

  it('can stop and restart scheduled work without creating duplicate timers', async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    const controller = new RefreshController(5000, task);

    controller.start();
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);

    controller.stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(task).toHaveBeenCalledTimes(1);

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('does not overlap manual refreshes', async () => {
    let release: (() => void) | undefined;
    const task = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const controller = new RefreshController(5000, task);

    const first = controller.refreshNow();
    await controller.refreshNow();
    expect(task).toHaveBeenCalledTimes(1);

    release?.();
    await first;
    controller.dispose();
  });

  it('distinguishes initial, scheduled, and manual refreshes', async () => {
    vi.useFakeTimers();
    const reasons: string[] = [];
    const controller = new RefreshController(5000, async (reason) => { reasons.push(reason); });
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await controller.refreshNow();
    expect(reasons).toEqual(['initial', 'scheduled', 'manual']);
    controller.dispose();
  });
});


