import { Disposable, OutputChannel, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { FlashNewsItem } from '@stock-fund/domain';
import { flashNewsKey, unseenFlashNews } from './newsModel';

export class NewsOutputService implements Disposable {
  private readonly output: OutputChannel;
  private readonly status: StatusBarItem;
  private readonly seen = new Set<string>();
  private readonly initializedSources = new Set<string>();
  private seenOrder: string[] = [];
  private recent: string[] = [];
  private latest: FlashNewsItem[] = [];
  private enabled = false;
  private notificationsEnabled = false;
  private opened = false;
  private hasOutput = false;
  private unread = 0;

  constructor() {
    this.output = window.createOutputChannel('Stock Fund Flash News');
    this.status = window.createStatusBarItem(StatusBarAlignment.Right, 3);
    this.status.name = 'Stock Fund flash news';
    this.status.command = 'stock-fund.showNewsOutput';
    this.renderStatus();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.renderStatus();
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  process(items: readonly FlashNewsItem[]): void {
    this.latest = [...items].sort((a, b) => newsTimestamp(a.time) - newsTimestamp(b.time));
    const established = items.filter((item) => this.initializedSources.has(item.source));
    const unseen = unseenFlashNews(established, this.seen);
    items.forEach((item) => this.initializedSources.add(item.source));
    this.remember(items);
    if (this.opened && !this.hasOutput && this.appendSnapshot()) return;
    if (!this.enabled || unseen.length === 0) return;
    for (const item of unseen) {
      this.append(item);
      this.recent.push(`${formatTime(item.time)} ${item.title}`);
      this.recent = this.recent.slice(-5);
      this.unread += 1;
    }
    this.renderStatus();
    if (this.notificationsEnabled) {
      const important = [...unseen].reverse().find((item) => item.important);
      if (important) void window.showInformationMessage(`[${important.source}] ${important.title}`);
    }
  }

  show(): void {
    this.opened = true;
    this.appendSnapshot();
    this.output.show(true);
    this.unread = 0;
    this.renderStatus();
  }

  dispose(): void {
    this.output.dispose();
    this.status.dispose();
  }

  private remember(items: readonly FlashNewsItem[]): void {
    for (const item of items) {
      const key = flashNewsKey(item);
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      this.seenOrder.push(key);
    }
    if (this.seenOrder.length > 500) {
      const removed = this.seenOrder.splice(0, this.seenOrder.length - 500);
      removed.forEach((key) => this.seen.delete(key));
    }
  }

  private appendSnapshot(): boolean {
    if (this.hasOutput || this.latest.length === 0) return false;
    this.latest.forEach((item) => this.append(item));
    return true;
  }

  private append(item: FlashNewsItem): void {
    this.output.appendLine(`${formatNews(item)}\n${'-'.repeat(60)}`);
    this.hasOutput = true;
  }

  private renderStatus(): void {
    if (!this.enabled) {
      this.status.hide();
      return;
    }
    this.status.text = `$(radio-tower) ${this.unread}`;
    this.status.tooltip = this.recent.length > 0
      ? `Flash news unread: ${this.unread}\n\n${[...this.recent].reverse().join('\n')}`
      : 'Flash news output';
    this.status.show();
  }
}

function formatNews(item: FlashNewsItem): string {
  return [
    `[${formatTime(item.time)}] [${item.source}]${item.important ? ' [Important]' : ''}`,
    item.title,
    item.summary,
    item.url,
  ].filter(Boolean).join('\n');
}

function formatTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function newsTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
