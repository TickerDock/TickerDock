import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('../extension/dist/webview-ui');
const cssPath = resolve(output, 'webview.css');
const jsPath = resolve(output, 'webview.js');
if (!existsSync(cssPath) || !existsSync(jsPath)) throw new Error('Webview build is missing its JavaScript or CSS bundle.');

const css = readFileSync(cssPath, 'utf8');
if (!css.includes('url(./assets/codicon-')) throw new Error('Codicon font URL must remain relative to the Webview CSS bundle.');
if (css.includes('url(/assets/')) throw new Error('Absolute asset URLs do not resolve inside a VS Code Webview.');

const assets = resolve(output, 'assets');
if (!existsSync(assets) || !readdirSync(assets).some((file) => /^codicon-.+\.ttf$/.test(file))) {
  throw new Error('Codicon font asset is missing from the Webview build.');
}
