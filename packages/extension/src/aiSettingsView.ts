import { Uri, ViewColumn, window } from 'vscode';
import { ConfigRepository } from './configRepository';
import { SecretRepository } from './secretRepository';
import { postWebviewMessage, readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';
import { validateAiSettings } from './aiSettingsModel';

export async function showAiSettings(extensionUri: Uri, config: ConfigRepository, secrets: SecretRepository): Promise<void> {
  const panel = window.createWebviewPanel('tickerdockAiSettings', 'AI 助手配置', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  const readState = async () => ({
    ...config.getAiConfig(),
    historyRange: config.getAiStockHistoryRange(),
    hasApiKey: Boolean(await secrets.getAiApiKey()),
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'aiSettings', state: await readState() });
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    const dirty = readWebviewEnvelope(message, 'setDirty');
    if (dirty && typeof dirty.dirty === 'boolean') panel.title = `${dirty.dirty ? '● ' : ''}AI 助手配置`;
    try {
      if (readWebviewEnvelope(message, 'requestAiKey')) {
        await postWebviewMessage(panel.webview, 'aiKeyLoaded', { apiKey: await secrets.getAiApiKey() ?? '' });
        return;
      }
      if (readWebviewEnvelope(message, 'deleteAiKey')) {
        await secrets.deleteAiApiKey();
        await postWebviewMessage(panel.webview, 'aiSettingsSaved', { state: await readState(), status: 'AI 密钥已删除' });
        return;
      }
      const payload = readWebviewEnvelope(message, 'saveAiSettings');
      if (!payload) return;
      const value = validateAiSettings(payload.value);
      await Promise.all([
        config.setAiConfig(value),
        config.setAiStockHistoryRange(value.historyRange),
        ...(value.apiKey ? [secrets.setAiApiKey(value.apiKey)] : []),
      ]);
      await postWebviewMessage(panel.webview, 'aiSettingsSaved', { state: await readState(), status: '已保存' });
    } catch (error) {
      await postWebviewMessage(panel.webview, 'error', { message: error instanceof Error ? error.message : String(error) });
    }
  });
}
