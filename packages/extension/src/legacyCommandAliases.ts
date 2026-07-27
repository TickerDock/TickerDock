import { commands, ExtensionContext, extensions } from 'vscode';
import { LEGACY_COMMAND_ALIASES, LEGACY_EXTENSION_ID } from './legacyCommandModel';

export async function registerLegacyCommandAliases(context: ExtensionContext): Promise<void> {
  const registeredCommands = new Set(await commands.getCommands(true));
  if (!extensions.getExtension(LEGACY_EXTENSION_ID)) {
    const availableAliases = LEGACY_COMMAND_ALIASES.filter(([legacy]) => !registeredCommands.has(legacy));
    context.subscriptions.push(...availableAliases.map(([legacy, current]) =>
      commands.registerCommand(legacy, (...args: unknown[]) => commands.executeCommand(current, ...args))
    ));
  }
}
