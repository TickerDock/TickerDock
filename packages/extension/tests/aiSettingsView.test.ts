import { describe, expect, it } from 'vitest';
import { validateAiSettings } from '../src/aiSettingsModel';

describe('AI settings view', () => {
  it('validates and normalizes settings without requiring a replacement key', () => {
    expect(validateAiSettings({
      baseUrl: ' https://api.openai.com/v1 ', model: ' gpt-5.6 ', apiMode: 'responses', historyRange: '6m', apiKey: '',
    })).toEqual({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.6', apiMode: 'responses', historyRange: '6m' });
  });

  it('rejects insecure remote API addresses', () => {
    expect(() => validateAiSettings({
      baseUrl: 'http://example.com/v1', model: 'model', apiMode: 'chat-completions', historyRange: '1m',
    })).toThrow(/HTTPS/);
  });
});
