import { homedir } from 'node:os';
import { join } from 'node:path';
import { commands, ConfigurationTarget, ExtensionContext, Uri, window, workspace } from 'vscode';
import {
  createSettingsBundle,
  parseSettingsBundle,
  TRANSFERABLE_SETTING_KEYS,
  TransferableSettingKey,
} from './settingsTransfer';

const MAX_IMPORT_BYTES = 1024 * 1024;

export function registerSettingsCommands(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand('tickerdock.exportSettings', () => exportSettings()),
    commands.registerCommand('tickerdock.importSettings', () => importSettings(context))
  );
}

async function exportSettings(): Promise<void> {
  try {
    const bundle = createSettingsBundle(readCurrentSettings());
    const date = new Date().toISOString().slice(0, 10);
    const uri = await window.showSaveDialog({
      defaultUri: Uri.file(join(homedir(), `tickerdock-settings-${date}.json`)),
      filters: { 'JSON files': ['json'] },
      saveLabel: 'Export Settings',
    });
    if (!uri) return;
    await workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(bundle, null, 2), 'utf8'));
    void window.showInformationMessage(`Settings exported to ${uri.fsPath}. Secrets were not included.`);
  } catch (error) {
    void window.showErrorMessage(`Settings export failed: ${errorMessage(error)}`);
  }
}

async function importSettings(context: ExtensionContext): Promise<void> {
  try {
    const selected = await window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'JSON files': ['json'] },
      openLabel: 'Import Settings',
    });
    const uri = selected?.[0];
    if (!uri) return;
    const bytes = await workspace.fs.readFile(uri);
    if (bytes.byteLength > MAX_IMPORT_BYTES) throw new Error('The settings file exceeds the 1 MB limit.');

    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch {
      throw new Error('The selected file is not valid JSON.');
    }
    const parsed = parseSettingsBundle(raw);
    const count = Object.keys(parsed.settings).length;
    const secretNotice = parsed.ignoredKeys.some((key) => /cookie|apikey/i.test(key))
      ? ' Stored secrets in the file will be ignored.'
      : '';
    const confirmation = await window.showWarningMessage(
      `Import ${count} ${parsed.legacy ? 'legacy ' : ''}settings? Existing global values will be replaced.${secretNotice}`,
      { modal: true },
      'Import'
    );
    if (confirmation !== 'Import') return;

    const backup = createSettingsBundle(readCurrentSettings());
    await workspace.fs.createDirectory(context.globalStorageUri);
    const backupUri = Uri.joinPath(context.globalStorageUri, `settings-backup-${Date.now()}.json`);
    await workspace.fs.writeFile(backupUri, Buffer.from(JSON.stringify(backup, null, 2), 'utf8'));
    await applySettingsWithRollback(parsed.settings);
    void window.showInformationMessage(`Imported ${count} settings. Backup: ${backupUri.fsPath}`);
  } catch (error) {
    void window.showErrorMessage(`Settings import failed: ${errorMessage(error)}`);
  }
}

function readCurrentSettings(): Partial<Record<TransferableSettingKey, unknown>> {
  const configuration = workspace.getConfiguration('tickerdock');
  return Object.fromEntries(TRANSFERABLE_SETTING_KEYS.map((key) => [key, configuration.get(key)]));
}

async function applySettingsWithRollback(
  imported: Partial<Record<TransferableSettingKey, unknown>>
): Promise<void> {
  const configuration = workspace.getConfiguration('tickerdock');
  const entries = Object.entries(imported) as Array<[TransferableSettingKey, unknown]>;
  const previous = new Map(entries.map(([key]) => [key, configuration.inspect(key)?.globalValue]));
  const written: TransferableSettingKey[] = [];
  try {
    for (const [key, value] of entries) {
      written.push(key);
      await configuration.update(key, value, ConfigurationTarget.Global);
    }
  } catch (error) {
    await Promise.allSettled(written.map((key) =>
      configuration.update(key, previous.get(key), ConfigurationTarget.Global)
    ));
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
