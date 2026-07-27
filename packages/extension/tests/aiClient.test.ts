import { describe, expect, it } from 'vitest';
import { AiTextClient, readResponsesText } from '../src/aiClient';

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

  it('falls back to Chat Completions when a compatible gateway reports an upstream Responses failure', async () => {
    const urls: string[] = [];
    const request = async (url: string | URL | Request) => {
      urls.push(String(url));
      return urls.length === 1
        ? Response.json({ error: { message: 'Error from provider (Console Go): Upstream request failed' } }, { status: 502 })
        : Response.json({ choices: [{ message: { content: 'Fallback result' } }] });
    };
    const client = new AiTextClient({
      apiKey: 'secret', baseUrl: 'https://gateway.example/v1', model: 'model', apiMode: 'responses',
    }, request as typeof fetch);
    await expect(client.generate('Instructions', 'Input')).resolves.toBe('Fallback result');
    expect(urls).toEqual(['https://gateway.example/v1/responses', 'https://gateway.example/v1/chat/completions']);
    expect(client.apiModeUsed).toBe('chat-completions');
  });

  it('does not switch protocols for the official OpenAI endpoint', async () => {
    let calls = 0;
    const request = async () => {
      calls += 1;
      return Response.json({ error: { message: 'Upstream request failed' } }, { status: 502 });
    };
    const client = new AiTextClient({
      apiKey: 'secret', baseUrl: 'https://api.openai.com/v1', model: 'model', apiMode: 'responses',
    }, request as typeof fetch);
    await expect(client.generate('Instructions', 'Input')).rejects.toThrow('HTTP 502: Upstream request failed');
    expect(calls).toBe(1);
  });

  it('includes non-JSON provider errors in the failure message', async () => {
    const request = async () => new Response('Bad gateway', { status: 502 });
    const client = new AiTextClient({
      apiKey: 'secret', baseUrl: 'https://api.openai.com/v1', model: 'model', apiMode: 'responses',
    }, request as typeof fetch);
    await expect(client.generate('Instructions', 'Input')).rejects.toThrow('HTTP 502: Bad gateway');
  });
});


