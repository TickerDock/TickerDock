import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

function stockFundExtension(): vscode.Extension<unknown> {
  const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'stock-fund');
  assert.ok(extension, 'Stock Fund extension was not loaded by the Extension Host');
  return extension;
}

suite('Stock Fund extension', () => {
  test('activates and registers every contributed command', async () => {
    const extension = stockFundExtension();
    await extension.activate();
    assert.equal(extension.isActive, true);

    const registered = new Set(await vscode.commands.getCommands(true));
    const contributions = extension.packageJSON.contributes?.commands as Array<{ command: string }> | undefined;
    assert.ok(contributions?.length, 'No commands were found in the extension manifest');
    for (const { command } of contributions) {
      assert.ok(registered.has(command), `Contributed command is not registered: ${command}`);
    }
  });

  test('reloads configuration used by a registered command', async () => {
    const configuration = vscode.workspace.getConfiguration('stock-fund');
    const originalGlobalValue = configuration.inspect<boolean>('marketHoursEnabled')?.globalValue;

    try {
      await configuration.update('marketHoursEnabled', false, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('stock-fund.toggleMarketHours');
      assert.equal(configuration.get<boolean>('marketHoursEnabled'), true);
    } finally {
      await configuration.update('marketHoursEnabled', originalGlobalValue, vscode.ConfigurationTarget.Global);
    }
  });
});
