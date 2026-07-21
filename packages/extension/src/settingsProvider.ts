import { ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { SETTINGS_ENTRIES, SettingsEntry } from './settingsModel';

export class SettingsTreeItem extends TreeItem {
  constructor(public readonly entry: SettingsEntry) {
    super(entry.label, TreeItemCollapsibleState.None);
    this.id = `settings:${entry.command}`;
    this.iconPath = new ThemeIcon(entry.icon);
    this.command = {
      title: entry.label,
      command: entry.command,
    };
  }
}

export class SettingsProvider implements TreeDataProvider<SettingsTreeItem> {
  private readonly items = SETTINGS_ENTRIES.map((entry) => new SettingsTreeItem(entry));

  getTreeItem(item: SettingsTreeItem): TreeItem { return item; }

  getChildren(item?: SettingsTreeItem): SettingsTreeItem[] {
    return item ? [] : this.items;
  }
}
