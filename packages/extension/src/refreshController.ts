import type { Disposable } from 'vscode';

export type RefreshReason = 'initial' | 'scheduled' | 'manual';

export class RefreshController implements Disposable {
  private timer: NodeJS.Timeout | undefined;
  private started = false;
  private running = false;
  private disposed = false;

  constructor(
    private intervalMs: number,
    private readonly refreshTask: (reason: RefreshReason) => Promise<void>
  ) {}

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.schedule(0, 'initial');
  }

  stop(): void {
    this.started = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  updateInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.started) this.schedule(intervalMs);
  }

  async refreshNow(): Promise<void> {
    await this.run('manual');
  }

  private async run(reason: RefreshReason): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      await this.refreshTask(reason);
    } finally {
      this.running = false;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
  }

  private schedule(delay: number, reason: RefreshReason = 'scheduled'): void {
    if (!this.started || this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      this.timer = undefined;
      await this.run(reason);
      if (this.started) this.schedule(this.intervalMs);
    }, delay);
  }
}
