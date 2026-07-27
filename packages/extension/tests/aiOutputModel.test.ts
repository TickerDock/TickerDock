import { describe, expect, it } from 'vitest';
import { aiResearchTitle, formatAiOutputEntry } from '../src/aiOutputModel';

describe('AI output model', () => {
  it('normalizes and bounds general research titles', () => {
    expect(aiResearchTitle('  market   outlook  ')).toBe('AI Research: market outlook');
    expect(aiResearchTitle('abcdefghij', 8)).toBe('AI Research: abcde...');
  });

  it('formats a readable result-only history entry', () => {
    const entry = formatAiOutputEntry('AI Analysis: Example', '  Result text  ', new Date('2026-07-17T00:00:00Z'));
    expect(entry).toContain('==== AI Analysis: Example ====');
    expect(entry).toContain('\nResult text\n');
    expect(entry).not.toMatch(/api[_ -]?key|authorization/i);
  });
});


