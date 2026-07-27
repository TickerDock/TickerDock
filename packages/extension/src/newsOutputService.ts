import {
  Disposable,
  env,
  Event,
  EventEmitter,
  StatusBarAlignment,
  StatusBarItem,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import { FlashNewsItem } from '@tickerdock/domain';
import { flashNewsKey, unseenFlashNews } from './newsModel';

export class NewsOutputService implements Disposable {
  private readonly status: StatusBarItem;
  private readonly seen = new Set<string>();
  private readonly initializedSources = new Set<string>();
  private readonly openChanged = new EventEmitter<boolean>();
  private readonly panelDisposables: Disposable[] = [];
  private seenOrder: string[] = [];
  private recent: string[] = [];
  private latest: FlashNewsItem[] = [];
  private panel: WebviewPanel | undefined;
  private enabled = false;
  private notificationsEnabled = false;
  private webviewReady = false;
  private hasOutput = false;

  readonly onDidChangeOpen: Event<boolean> = this.openChanged.event;

  constructor() {
    this.status = window.createStatusBarItem(StatusBarAlignment.Right, 3);
    this.status.name = 'TickerDock flash news';
    this.status.command = 'tickerdock.showNewsOutput';
    this.renderStatus();
  }

  get isOpen(): boolean {
    return this.panel !== undefined;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.renderStatus();
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  process(items: readonly FlashNewsItem[]): void {
    if (!this.panel) return;
    this.latest = [...items].sort((a, b) => newsTimestamp(a.time) - newsTimestamp(b.time));
    const established = items.filter((item) => this.initializedSources.has(item.source));
    const unseen = unseenFlashNews(established, this.seen);
    items.forEach((item) => this.initializedSources.add(item.source));
    this.remember(items);
    if (!this.hasOutput) {
      this.appendSnapshot();
      return;
    }
    for (const item of unseen) {
      this.append(item);
      this.recent.push(`${formatTime(item.time)} ${item.title}`);
      this.recent = this.recent.slice(-5);
    }
    this.renderStatus();
    if (this.notificationsEnabled) {
      const important = [...unseen].reverse().find((item) => item.important);
      if (important) void window.showInformationMessage(`[${important.source}] ${important.title}`);
    }
  }

  show(): void {
    if (this.panel) {
      this.panel.reveal(ViewColumn.Beside, true);
      return;
    }
    const panel = window.createWebviewPanel(
      'tickerdock.flashNewsConsole',
      'TickerDock Flash News',
      ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: false }
    );
    this.panel = panel;
    this.webviewReady = false;
    this.hasOutput = false;
    panel.webview.html = consoleHtml(panel.webview.cspSource);
    this.panelDisposables.push(
      panel.webview.onDidReceiveMessage((message: unknown) => this.handleMessage(message)),
      panel.onDidDispose(() => this.handlePanelClosed())
    );
    this.renderStatus();
    this.openChanged.fire(true);
  }

  dispose(): void {
    this.panel?.dispose();
    this.disposePanelListeners();
    this.status.dispose();
    this.openChanged.dispose();
  }

  private handleMessage(message: unknown): void {
    if (!message || typeof message !== 'object') return;
    const value = message as { type?: unknown; url?: unknown };
    if (value.type === 'ready') {
      this.webviewReady = true;
      this.appendSnapshot();
      return;
    }
    if (value.type === 'openUrl' && typeof value.url === 'string') {
      const uri = Uri.parse(value.url);
      if (uri.scheme === 'http' || uri.scheme === 'https') void env.openExternal(uri);
    }
  }

  private handlePanelClosed(): void {
    this.panel = undefined;
    this.webviewReady = false;
    this.hasOutput = false;
    this.disposePanelListeners();
    this.renderStatus();
    this.openChanged.fire(false);
  }

  private disposePanelListeners(): void {
    this.panelDisposables.splice(0).forEach((disposable) => disposable.dispose());
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

  private appendSnapshot(): void {
    if (!this.webviewReady || this.hasOutput || this.latest.length === 0) return;
    this.latest.forEach((item) => this.append(item));
  }

  private append(item: FlashNewsItem): void {
    if (!this.webviewReady || !this.panel) return;
    void this.panel.webview.postMessage({ type: 'append', item });
    this.hasOutput = true;
  }

  private renderStatus(): void {
    if (!this.enabled) {
      this.status.hide();
      return;
    }
    this.status.text = this.panel ? '$(radio-tower) Flash News' : '$(output) Flash News';
    this.status.tooltip = this.panel
      ? 'Flash news console is active'
      : this.recent.length > 0 ? [...this.recent].reverse().join('\n') : 'Open flash news console';
    this.status.show();
  }
}

function consoleHtml(cspSource: string): string {
  const nonce = Math.random().toString(36).slice(2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>TickerDock Flash News</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font: 13px/1.5 var(--vscode-font-family); }
    header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
    .live { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-testing-iconPassed); }
    .title { font-weight: 600; }
    .count { margin-left: auto; color: var(--vscode-descriptionForeground); font-variant-numeric: tabular-nums; }
    #log { min-height: calc(100vh - 38px); }
    article { padding: 10px 14px 11px; border-bottom: 1px solid var(--vscode-panel-border); }
    article.important { border-left: 3px solid var(--vscode-editorWarning-foreground); padding-left: 11px; }
    .meta { display: flex; gap: 8px; margin-bottom: 3px; color: var(--vscode-descriptionForeground); font: 12px/1.4 var(--vscode-editor-font-family); }
    .source { color: var(--vscode-textLink-foreground); text-transform: uppercase; }
    .headline { color: inherit; font-weight: 600; text-decoration: none; }
    a.headline:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
    .summary { margin-top: 4px; color: var(--vscode-descriptionForeground); white-space: pre-wrap; }
  </style>
</head>
<body>
  <header><span class="live"></span><span class="title">Live</span><span id="count" class="count">0</span></header>
  <main id="log"></main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const log = document.getElementById('log');
    const count = document.getElementById('count');
    let total = 0;
    window.addEventListener('message', ({ data }) => {
      if (data.type !== 'append' || !data.item) return;
      const item = data.item;
      const article = document.createElement('article');
      if (item.important) article.className = 'important';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const time = document.createElement('span');
      const parsed = new Date(item.time);
      time.textContent = Number.isNaN(parsed.getTime()) ? item.time : parsed.toLocaleString();
      const source = document.createElement('span');
      source.className = 'source';
      source.textContent = item.source;
      meta.append(time, source);
      const headline = document.createElement(item.url ? 'a' : 'div');
      headline.className = 'headline';
      headline.textContent = item.title;
      if (item.url) {
        headline.href = '#';
        headline.addEventListener('click', (event) => {
          event.preventDefault();
          vscode.postMessage({ type: 'openUrl', url: item.url });
        });
      }
      article.append(meta, headline);
      if (item.summary) {
        const summary = document.createElement('div');
        summary.className = 'summary';
        summary.textContent = item.summary;
        article.append(summary);
      }
      log.append(article);
      while (log.childElementCount > 300) log.firstElementChild.remove();
      total += 1;
      count.textContent = String(total);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

function formatTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function newsTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
