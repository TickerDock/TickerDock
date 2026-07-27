import { AiConfig, AiStockHistoryRange } from './configRepository';

export interface AiSettingsValue extends AiConfig {
  historyRange: AiStockHistoryRange;
  apiKey?: string;
}

export function validateAiSettings(value: unknown): AiSettingsValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('无效的 AI 配置。');
  const record = value as Record<string, unknown>;
  const baseUrl = typeof record.baseUrl === 'string' ? record.baseUrl.trim() : '';
  const model = typeof record.model === 'string' ? record.model.trim() : '';
  const apiKey = typeof record.apiKey === 'string' ? record.apiKey.trim() : '';
  const urlError = validateBaseUrl(baseUrl);
  if (urlError) throw new Error(urlError);
  if (!model || model.length > 160) throw new Error('请输入有效的模型名称。');
  if (record.apiMode !== 'responses' && record.apiMode !== 'chat-completions') throw new Error('请选择有效的 API 协议。');
  if (!isHistoryRange(record.historyRange)) throw new Error('请选择有效的股票历史范围。');
  if (apiKey.length > 4096) throw new Error('API 密钥过长。');
  return { baseUrl, model, apiMode: record.apiMode, historyRange: record.historyRange, ...(apiKey ? { apiKey } : {}) };
}

function validateBaseUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    return url.protocol === 'https:' || localHttp ? undefined : '请使用 HTTPS；本地服务可使用 localhost HTTP。';
  } catch {
    return '请输入有效的 API 地址。';
  }
}

function isHistoryRange(value: unknown): value is AiStockHistoryRange {
  return value === '1w' || value === '1m' || value === '3m' || value === '6m' || value === '1y';
}
