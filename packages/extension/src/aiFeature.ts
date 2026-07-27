import { ProgressLocation, QuickPickItem, Uri, ViewColumn, window } from 'vscode';
import { FlashNewsGateway, StockGateway, StockResearchGateway } from '@tickerdock/domain';
import { AiTextClient } from './aiClient';
import { AiStockHistoryRange, ConfigRepository } from './configRepository';
import { SecretRepository } from './secretRepository';
import { buildStockAnalysisInput, researchKeywordForStockCode } from './stockAnalysisModel';
import { aiResearchTitle } from './aiOutputModel';
import { AiOutputService } from './aiOutputService';
import { renderWebviewUi, webviewUiRoot } from './webviewUi';
import { showAiSettings } from './aiSettingsView';
import { GENERAL_INSTRUCTIONS, STOCK_INSTRUCTIONS } from './aiPrompts';

const HISTORY_COUNTS: Record<AiStockHistoryRange, number> = {
  '1w': 5,
  '1m': 22,
  '3m': 66,
  '6m': 132,
  '1y': 264,
};

export async function configureAi(extensionUri: Uri, config: ConfigRepository, secrets: SecretRepository): Promise<void> {
  await showAiSettings(extensionUri, config, secrets);
}

export async function deleteAiKey(secrets: SecretRepository): Promise<void> {
  await secrets.deleteAiApiKey();
  void window.showInformationMessage('Stored AI API key deleted.');
}

export async function configureAiHistoryRange(config: ConfigRepository): Promise<void> {
  const selected = await window.showQuickPick<QuickPickItem & { value: AiStockHistoryRange }>([
    { label: '1 week', value: '1w' },
    { label: '1 month', value: '1m' },
    { label: '3 months', value: '3m' },
    { label: '6 months', value: '6m' },
    { label: '1 year', value: '1y' },
  ], { placeHolder: `AI stock history range (current: ${config.getAiStockHistoryRange()})` });
  if (!selected) return;
  await config.setAiStockHistoryRange(selected.value);
  void window.showInformationMessage(`AI stock history range set to ${selected.label}.`);
}

export async function askAi(
  extensionUri: Uri,
  config: ConfigRepository,
  secrets: SecretRepository,
  output: AiOutputService
): Promise<void> {
  const input = await window.showInputBox({ prompt: 'Ask AI', ignoreFocusOut: true });
  if (!input?.trim()) return;
  await generateAndShow(extensionUri, aiResearchTitle(input), GENERAL_INSTRUCTIONS, input.trim(), config, secrets, output);
}

export async function analyzeStock(
  extensionUri: Uri,
  code: string,
  name: string,
  gateway: StockGateway,
  newsGateway: FlashNewsGateway,
  researchGateway: StockResearchGateway,
  config: ConfigRepository,
  secrets: SecretRepository,
  output: AiOutputService
): Promise<void> {
  try {
    const historyRange = config.getAiStockHistoryRange();
    const researchKeyword = researchKeywordForStockCode(code);
    const [klines, news, research] = await window.withProgress(
      { location: ProgressLocation.Notification, title: `Loading ${name} research data...` },
      () => Promise.all([
        gateway.getKlines(code, { period: 'day', count: HISTORY_COUNTS[historyRange], adjust: 'qfq' }),
        newsGateway.getLatest(20).catch((error) => {
          console.warn('[tickerdock] Flash-news context unavailable for AI analysis', error);
          return [];
        }),
        researchKeyword
          ? researchGateway.search(researchKeyword, 10).catch((error) => {
              console.warn('[tickerdock] Jiuyangongshe research unavailable for AI analysis', error);
              return [];
            })
          : Promise.resolve([]),
      ])
    );
    const input = buildStockAnalysisInput(code, name, historyRange, klines, news, research);
    await generateAndShow(extensionUri, `AI分析: ${name}`, STOCK_INSTRUCTIONS, input, config, secrets, output);
  } catch (error) {
    void window.showErrorMessage(errorMessage(error));
  }
}

async function generateAndShow(
  extensionUri: Uri,
  title: string,
  instructions: string,
  input: string,
  config: ConfigRepository,
  secrets: SecretRepository,
  output: AiOutputService
): Promise<void> {
  const apiKey = await secrets.getAiApiKey();
  if (!apiKey) {
    const action = await window.showWarningMessage('Configure an AI API key first.', 'Configure AI');
    if (action === 'Configure AI') await configureAi(extensionUri, config, secrets);
    return;
  }
  try {
    const aiConfig = config.getAiConfig();
    const client = new AiTextClient({ ...aiConfig, apiKey });
    const result = await window.withProgress(
      { location: ProgressLocation.Notification, title: 'Generating AI response...', cancellable: false },
      () => client.generate(instructions, input)
    );
    if (client.apiModeUsed !== aiConfig.apiMode) {
      await config.setAiConfig({ ...aiConfig, apiMode: client.apiModeUsed });
      void window.showInformationMessage('当前 AI 网关的 Responses API 不可用，已自动切换为 Chat Completions。');
    }
    output.record(title, result);
    showResult(extensionUri, title, result);
  } catch (error) {
    void window.showErrorMessage(`AI request failed: ${errorMessage(error)}`);
  }
}

function showResult(extensionUri: Uri, title: string, result: string): void {
  const panel = window.createWebviewPanel('tickerdockAiResult', title, ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: false,
    localResourceRoots: [webviewUiRoot(extensionUri)],
  });
  panel.webview.html = renderWebviewUi(panel.webview, extensionUri, { page: 'aiResult', title, result });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
