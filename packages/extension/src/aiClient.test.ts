import { describe, expect, it } from 'vitest';
import { AiTextClient, readResponsesText } from './aiClient';

describe('AiTextClient', () => {
  it('aggregates text across Responses API output items', () => {
    expect(readResponsesText({ output: [
      { type: 'reasoning' },
      { type: 'message', content: [{ type: 'output_text', text: 'First' }] },
      { type: 'message', content: [{ type: 'output_text', text: 'Second' }] },
    ] })).toBe('First\nSecond');
  });

  it('uses Responses API with non-persistent storage by default', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const request = async (_url: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ output: [{ content: [{ type: 'output_text', text: 'Result' }] }] });
    };
    const client = new AiTextClient({
      apiKey: 'secret', baseUrl: 'https://api.openai.com/v1/', model: 'model', apiMode: 'responses',
    }, request as typeof fetch);
    await expect(client.generate('Instructions', 'Input')).resolves.toBe('Result');
    expect(requestBody).toMatchObject({ model: 'model', instructions: 'Instructions', input: 'Input', store: false });
  });

  it('supports Chat Completions compatible gateways', async () => {
    const request = async () => Response.json({ choices: [{ message: { content: 'Compatible result' } }] });
    const client = new AiTextClient({
      apiKey: 'secret', baseUrl: 'https://gateway.example/v1', model: 'model', apiMode: 'chat-completions',
    }, request as typeof fetch);
    await expect(client.generate('Instructions', 'Input')).resolves.toBe('Compatible result');
  });
});
