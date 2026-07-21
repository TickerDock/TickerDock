import type { Disposable } from 'vscode';

export type RefreshReason = 'initial' | 'scheduled' | 'manual';

export class RefreshController implements Disposable {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private disposed = false;

  constructor(
    private intervalMs: number,
    private readonly refreshTask: (reason: RefreshReason) => Promise<void>
  ) {}

  start(): void {
    this.schedule(0, 'initial');
  }

  updateInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    this.schedule(intervalMs);
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
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private schedule(delay: number, reason: RefreshReason = 'scheduled'): void {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      await this.run(reason);
      this.schedule(this.intervalMs);
    }, delay);
  }
}
