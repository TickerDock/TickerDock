import { Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Sector } from './configRepository';

export class SectorTreeItem extends TreeItem {
  readonly kind = 'sector' as const;
  constructor(public readonly sector: Sector) {
    super(sector.name, TreeItemCollapsibleState.None);
    this.id = `sector:${sector.code}`;
    this.description = sector.code;
    this.contextValue = 'sector';
    this.iconPath = new ThemeIcon('layers');
    this.command = { command: 'stock-fund.openSector', title: '打开板块详情', arguments: [this] };
  }
}

export class SectorProvider implements TreeDataProvider<SectorTreeItem> {
  private readonly changed = new EventEmitter<void>();
  readonly onDidChangeTreeData: Event<void> = this.changed.event;
  private sectors: Sector[] = [];
  setSectors(sectors: readonly Sector[]): void { this.sectors = [...sectors]; this.changed.fire(); }
  getTreeItem(item: SectorTreeItem): TreeItem { return item; }
  getChildren(): SectorTreeItem[] { return this.sectors.map((sector) => new SectorTreeItem(sector)); }
}
