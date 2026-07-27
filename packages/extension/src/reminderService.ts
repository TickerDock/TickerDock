import { Disposable, Memento, window } from 'vscode';
import { evaluateStockReminders, StockQuote } from '@tickerdock/domain';
import { ConfigRepository } from './configRepository';
import { ReminderStateRepository } from './reminderState';

const COOLDOWN_MS = 3 * 60 * 1000;
const PERSIST_DELAY_MS = 30_000;

export class ReminderService implements Disposable {
  private previous = new Map<string, StockQuote>();
  private remindedAt = new Map<string, number>();
  private readonly state: ReminderStateRepository;
  private readonly ready: Promise<void>;
  private persistTimer: NodeJS.Timeout | undefined;
  private writeChain: Promise<void> = Promise.resolve();
  private dirty = false;
  private disposed = false;

  constructor(private readonly config: ConfigRepository, storage: Memento) {
    this.state = new ReminderStateRepository(storage);
    this.ready = Promise.resolve().then(() => {
      const loaded = this.state.load();
      this.previous = loaded.previous;
      this.remindedAt = loaded.remindedAt;
    });
  }

  async process(quotes: readonly StockQuote[]): Promise<void> {
    await this.ready;
    if (this.disposed) return;
    const reminders = this.config.getStockReminders();
    const enabled = this.config.getRemindersEnabled();
    const trackedCodes = new Set(enabled
      ? [...reminders].flatMap(([code, rules]) => rules.length > 0 ? [code] : [])
      : []);
    const currentCodes = new Set(quotes.flatMap(({ code }) => trackedCodes.has(code) ? [code] : []));
    for (const code of this.previous.keys()) {
      if (!currentCodes.has(code)) {
        this.previous.delete(code);
        this.dirty = true;
      }
    }
    for (const code of this.remindedAt.keys()) {
      if (!currentCodes.has(code)) {
        this.remindedAt.delete(code);
        this.dirty = true;
      }
    }
    for (const quote of quotes) {
      if (!trackedCodes.has(quote.code)) continue;
      const previous = this.previous.get(quote.code);
      this.previous.set(quote.code, quote);
      if (!previous || previous.price !== quote.price || previous.changeRatio !== quote.changeRatio) {
        this.dirty = true;
      }
      if (!previous) continue;
      const events = evaluateStockReminders(previous, quote, reminders.get(quote.code) ?? []);
      if (events.length === 0 || !this.canNotify(quote.code)) continue;
      this.remindedAt.set(quote.code, Date.now());
      this.dirty = true;
      await this.persist();
      const event = events[0]!;
      const unit = event.rule.kind === 'price' ? '' : '%';
      const value = event.rule.kind === 'price' ? event.value : event.value * 100;
      const action = await window.showWarningMessage(
        `${event.name} crossed ${event.rule.direction} ${event.rule.threshold * (event.rule.kind === 'price' ? 1 : 100)}${unit}; current ${value.toFixed(2)}${unit}`,
        'Remove reminders'
      );
      if (action === 'Remove reminders') await this.config.removeStockReminders(quote.code);
    }
    if (this.dirty) this.schedulePersist();
  }

  dispose(): void {
    this.disposed = true;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = undefined;
    if (this.dirty) void this.persist();
  }

  private canNotify(code: string): boolean {
    return Date.now() - (this.remindedAt.get(code) ?? 0) >= COOLDOWN_MS;
  }

  private schedulePersist(): void {
    if (this.disposed || this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      void this.persist();
    }, PERSIST_DELAY_MS);
  }

  private persist(): Promise<void> {
    if (!this.dirty) return this.writeChain;
    this.dirty = false;
    const snapshot = {
      previous: new Map(this.previous),
      remindedAt: new Map(this.remindedAt),
    };
    this.writeChain = this.writeChain
      .then(() => this.state.save(snapshot))
      .catch((error) => console.error('[tickerdock] Reminder state persistence failed', error));
    return this.writeChain;
  }
}
