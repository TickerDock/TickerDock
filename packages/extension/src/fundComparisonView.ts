import { Uri, ViewColumn, window } from 'vscode';
import { FundGateway } from '@tickerdock/domain';
import { filterFundNavRange, FundTrendRange } from './trendModel';
import { readWebviewEnvelope, renderWebviewUi, webviewUiRoot } from './webviewUi';

const CONTROLS = [
  { id: '1m', label: '1M' }, { id: '3m', label: '3M' }, { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' }, { id: 'all', label: 'All' },
] as const;

export async function showFundComparison(
  gateway: FundGateway,
  extensionUri: Uri,
  funds: readonly { code: string; name: string }[]
): Promise<void> {
  const panel = window.createWebviewPanel('tickerdockComparison', 'Fund Performance Comparison', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  let disposed = false;
  panel.onDidDispose(() => { disposed = true; });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundComparison', failedCodes: [], controls: CONTROLS, active: '1y' });

  try {
    const results = await Promise.allSettled(funds.map(async (fund) => ({
      ...fund,
      data: await gateway.getNavHistory(fund.code),
    })));
    if (disposed) return;
    const series = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const failedCodes = results.flatMap((result, index) =>
      result.status === 'rejected' ? [funds[index]!.code] : []
    );
    const render = (range: FundTrendRange) => {
      if (disposed) return;
      const filtered = series.map((item) => ({
        ...item,
        data: filterFundNavRange(item.data, range),
      }));
      panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundComparison', series: filtered, failedCodes, controls: CONTROLS, active: range });
    };
    panel.webview.onDidReceiveMessage((message: unknown) => {
      const payload = readWebviewEnvelope(message, 'changeFundComparisonRange');
      if (typeof payload?.range === 'string' && CONTROLS.some(({ id }) => id === payload.range)) render(payload.range as FundTrendRange);
    });
    render('1y');
  } catch (error) {
    if (!disposed) panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'fundComparison', failedCodes: [], controls: CONTROLS, active: '1y', error: error instanceof Error ? error.message : String(error) });
  }
}
