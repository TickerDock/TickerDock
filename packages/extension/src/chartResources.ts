import { Uri, Webview } from 'vscode';
import { ChartResources } from './chartPage';

export function chartResources(webview: Webview, extensionUri: Uri): ChartResources {
  return { scriptUri: webview.asWebviewUri(Uri.joinPath(extensionUri, 'dist', 'webviewCharts.js')).toString(), cspSource: webview.cspSource };
}
