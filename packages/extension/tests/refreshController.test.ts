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

  it('queues one manual refresh while another refresh is running', async () => {
    const releases: Array<() => void> = [];
    const task = vi.fn(() => new Promise<void>((resolve) => { releases.push(resolve); }));
    const controller = new RefreshController(5000, task);

    const first = controller.refreshNow();
    const second = controller.refreshNow();
    const third = controller.refreshNow();
    expect(task).toHaveBeenCalledTimes(1);

    releases.shift()?.();
    await first;
    expect(task).toHaveBeenCalledTimes(2);

    releases.shift()?.();
    await Promise.all([second, third]);
    expect(task).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('queues a manual refresh requested during the initial refresh', async () => {
    vi.useFakeTimers();
    const releases: Array<() => void> = [];
    const reasons: string[] = [];
    const controller = new RefreshController(5000, (reason) => {
      reasons.push(reason);
      return new Promise<void>((resolve) => { releases.push(resolve); });
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    const manual = controller.refreshNow();
    releases.shift()?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(reasons).toEqual(['initial', 'manual']);

    releases.shift()?.();
    await manual;
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


