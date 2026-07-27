import { Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { FlashNewsItem } from '@tickerdock/domain';

export class FlashNewsTreeItem extends TreeItem {
  constructor(public readonly news: FlashNewsItem) {
    super(news.title, TreeItemCollapsibleState.None);
    this.id = `flash-news:${news.id}`;
    this.contextValue = 'flashNews';
    this.description = formatNewsTime(news.time);
    this.tooltip = [news.title, news.summary, formatNewsDate(news.time), `Source: ${news.source}`].filter(Boolean).join('\n');
    this.iconPath = new ThemeIcon(news.important ? 'flame' : news.kind === 'economic-data' ? 'database' : 'megaphone');
    if (news.url) {
      this.command = {
        title: 'Open news detail',
        command: 'tickerdock.openFlashNews',
        arguments: [this],
      };
    }
  }
}

function formatNewsTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(11, 19) : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatNewsDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export class FlashNewsProvider implements TreeDataProvider<FlashNewsTreeItem> {
  private readonly changed = new EventEmitter<void>();
  private items: FlashNewsTreeItem[] = [];
  readonly onDidChangeTreeData: Event<void> = this.changed.event;

  setNews(news: readonly FlashNewsItem[], importantOnly: boolean): void {
    this.items = news
      .filter((item) => !importantOnly || item.important)
      .map((item) => new FlashNewsTreeItem(item));
    this.changed.fire();
  }

  getTreeItem(item: FlashNewsTreeItem): TreeItem { return item; }
  getChildren(): FlashNewsTreeItem[] { return this.items; }
}
