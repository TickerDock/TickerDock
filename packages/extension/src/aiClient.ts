export interface AiClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiMode: 'responses' | 'chat-completions';
}

export class AiTextClient {
  constructor(
    private readonly config: AiClientConfig,
    private readonly request: typeof fetch = fetch
  ) {}

  async generate(instructions: string, input: string): Promise<string> {
    const endpoint = this.config.apiMode === 'responses' ? 'responses' : 'chat/completions';
    const response = await this.request(`${normalizeBaseUrl(this.config.baseUrl)}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.config.apiMode === 'responses'
        ? {
            model: this.config.model,
            instructions,
            input,
            store: false,
          }
        : {
            model: this.config.model,
            messages: [
              { role: 'system', content: instructions },
              { role: 'user', content: input },
            ],
          }),
      signal: AbortSignal.timeout(60000),
    });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(readApiError(payload, response.status));
    const text = this.config.apiMode === 'responses'
      ? readResponsesText(payload)
      : readChatCompletionText(payload);
    if (!text) throw new Error('The AI service returned no text output.');
    return text;
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

function readChatCompletionText(payload: Record<string, unknown>): string {
  const choices = payload.choices;
  if (!Array.isArray(choices)) return '';
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;
  return typeof message?.content === 'string' ? message.content.trim() : '';
}

function readApiError(payload: Record<string, unknown>, status: number): string {
  const error = payload.error as Record<string, unknown> | undefined;
  return typeof error?.message === 'string' ? error.message : `AI request failed with HTTP ${status}.`;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}
