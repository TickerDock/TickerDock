import { commands, ExtensionContext, extensions } from 'vscode';
import { LEGACY_COMMAND_ALIASES, LEGACY_EXTENSION_ID } from './legacyCommandModel';

export function registerLegacyCommandAliases(context: ExtensionContext): void {
  if (extensions.getExtension(LEGACY_EXTENSION_ID)) return;
  context.subscriptions.push(...LEGACY_COMMAND_ALIASES.map(([legacy, current]) =>
    commands.registerCommand(legacy, (...args: unknown[]) => commands.executeCommand(current, ...args))
  ));
}
