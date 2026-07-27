import { Uri, ViewColumn, window } from 'vscode';
import { ConfigRepository, Sector } from './configRepository';
import { readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

export function showSectorManager(extensionUri: Uri, config: ConfigRepository, onSaved: (sectors: Sector[]) => void): void {
  const panel = window.createWebviewPanel('tickerdockSectors', '板块管理', ViewColumn.One, {
    enableScripts: true,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'sectorManager', sectors: config.getSectors() });
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    const dirty = readWebviewEnvelope(message, 'setDirty');
    if (dirty && typeof dirty.dirty === 'boolean') panel.title = `${dirty.dirty ? '● ' : ''}板块管理`;
    const payload = readWebviewEnvelope(message, 'saveSectors');
    if (!payload) return;
    try {
      const sectors = payload.sectors;
      if (!Array.isArray(sectors)) throw new Error('板块数据格式不正确。');
      const valid = sectors.map((item) => {
        if (!item || typeof item !== 'object') throw new Error('板块数据格式不正确。');
        const value = item as Record<string, unknown>;
        const code = typeof value.code === 'string' ? value.code.trim().toUpperCase() : '';
        const name = typeof value.name === 'string' ? value.name.trim() : '';
        if (!/^BK\d{4}$/.test(code) || !name) throw new Error('板块代码必须为 BK 加四位数字，且名称不能为空。');
        return { code, name };
      });
      await config.setSectors(valid);
      onSaved(config.getSectors());
      panel.dispose();
    } catch (error) {
      void window.showErrorMessage(error instanceof Error ? error.message : String(error));
    }
  });
}
