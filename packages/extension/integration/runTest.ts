import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');

  try {
    await runTests({
      version: '1.85.2',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions', '--disable-gpu', '--skip-welcome', '--skip-release-notes'],
    });
  } catch (error) {
    console.error('VS Code integration tests failed', error);
    process.exitCode = 1;
  }
}

void main();
