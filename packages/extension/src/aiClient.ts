import OpenAI from 'openai';
import type { APIError } from 'openai';

export interface AiClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiMode: 'responses' | 'chat-completions';
}

export class AiTextClient {
  private usedMode: AiClientConfig['apiMode'];
  private readonly client: OpenAI;

  constructor(
    private readonly config: AiClientConfig,
    private readonly request: typeof fetch = fetch
  ) {
    this.usedMode = config.apiMode;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: normalizeBaseUrl(config.baseUrl),
      timeout: 60000,
      maxRetries: 0,
      fetch: request,
    });
  }

  get apiModeUsed(): AiClientConfig['apiMode'] { return this.usedMode; }

  async generate(instructions: string, input: string): Promise<string> {
    try {
      const text = await this.generateWithMode(this.config.apiMode, instructions, input);
      this.usedMode = this.config.apiMode;
      return text;
    } catch (error) {
      if (!shouldFallbackToChat(this.config, error)) throw error;
      try {
        const text = await this.generateWithMode('chat-completions', instructions, input);
        this.usedMode = 'chat-completions';
        return text;
      } catch (fallbackError) {
        throw new Error(`Responses API failed: ${errorMessage(error)} Chat Completions fallback also failed: ${errorMessage(fallbackError)}`, { cause: fallbackError });
      }
    }
  }

  private async generateWithMode(mode: AiClientConfig['apiMode'], instructions: string, input: string): Promise<string> {
    const endpoint = mode === 'responses' ? 'responses' : 'chat/completions';
    try {
      const text = mode === 'responses'
        ? readResponsesText(await this.client.responses.create({
            model: this.config.model,
            instructions,
            input,
            store: false,
          }) as unknown as Record<string, unknown>)
        : (await this.client.chat.completions.create({
            model: this.config.model,
            messages: [
              { role: 'system', content: instructions },
              { role: 'user', content: input },
            ],
          })).choices[0]?.message.content?.trim() ?? '';
      if (!text) throw new Error('The AI service returned no text output.');
      return text;
    } catch (error) {
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new Error(`AI request timed out after 60 seconds (${endpoint}).`, { cause: error });
      }
      if (error instanceof OpenAI.APIError && typeof error.status === 'number') {
        throw new AiHttpError(formatApiError(error), error.status, { cause: error });
      }
      if (error instanceof OpenAI.APIConnectionError) {
        throw new Error(`Could not reach the AI service (${endpoint}): ${error.message}`, { cause: error });
      }
      throw error;
    }
  }
}

export function readResponsesText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string') return payload.output_text.trim();
  if (!Array.isArray(payload.output)) return '';
  return payload.output.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) return [];
    return content.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const value = entry as Record<string, unknown>;
      return value.type === 'output_text' && typeof value.text === 'string' ? [value.text] : [];
    });
  }).join('\n').trim();
}

class AiHttpError extends Error {
  constructor(message: string, readonly status: number, options?: ErrorOptions) { super(message, options); }
}

function formatApiError(error: APIError): string {
  const detail = error.error && typeof error.error === 'object' && 'message' in error.error
    && typeof (error.error as { message?: unknown }).message === 'string'
    ? (error.error as { message: string }).message
    : error.message.replace(/^\d{3}\s+/, '');
  return `HTTP ${error.status}: ${detail}`;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function shouldFallbackToChat(config: AiClientConfig, error: unknown): boolean {
  if (config.apiMode !== 'responses' || isOfficialOpenAi(config.baseUrl) || !(error instanceof AiHttpError)) return false;
  if ([404, 405, 415, 422, 501].includes(error.status)) return true;
  return error.status >= 500 && /(?:upstream|provider|responses? api|unsupported|not supported)/i.test(error.message);
}

function isOfficialOpenAi(baseUrl: string): boolean {
  try { return new URL(baseUrl).hostname.toLowerCase() === 'api.openai.com'; } catch { return false; }
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
