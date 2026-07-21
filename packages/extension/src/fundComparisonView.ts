import { randomBytes } from 'node:crypto';
import { Uri, ViewColumn, window } from 'vscode';
import { FundGateway } from '@stock-fund/domain';
import { filterFundNavRange, FundTrendRange } from './trendModel';
import { FundComparisonSeries, renderFundComparisonPage } from './fundComparisonPage';
import { renderTrendError, renderTrendLoading } from './trendPage';
import { chartResources } from './chartResources';

const CONTROLS = [
  { id: '1m', label: '1M' }, { id: '3m', label: '3M' }, { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' }, { id: 'all', label: 'All' },
] as const;

export async function showFundComparison(
  gateway: FundGateway,
  extensionUri: Uri,
  funds: readonly { code: string; name: string }[]
): Promise<void> {
  const panel = window.createWebviewPanel('stockFundComparison', 'Fund Performance Comparison', ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [Uri.joinPath(extensionUri, 'dist')],
  });
  let disposed = false;
  panel.onDidDispose(() => { disposed = true; });
  panel.webview.html = renderTrendLoading('Fund Performance Comparison');

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
      const filtered: FundComparisonSeries[] = series.map((item) => ({
        ...item,
        data: filterFundNavRange(item.data, range),
      }));
      panel.webview.html = renderFundComparisonPage(filtered, failedCodes, CONTROLS, range, nonce(), chartResources(panel.webview, extensionUri));
    };
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!message || typeof message !== 'object') return;
      const value = message as Record<string, unknown>;
      if (value.command === 'changeRange' && typeof value.range === 'string'
        && CONTROLS.some(({ id }) => id === value.range)) {
        render(value.range as FundTrendRange);
      }
    });
    render('1y');
  } catch (error) {
    if (!disposed) panel.webview.html = renderTrendError('Fund comparison unavailable', error);
  }
}

function nonce(): string {
  return randomBytes(18).toString('base64url');
}
