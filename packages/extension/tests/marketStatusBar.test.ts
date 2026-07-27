import { describe, expect, it } from 'vitest';
import { normalizeStatusBarCodes } from '../src/statusBarModel';

describe('normalizeStatusBarCodes', () => {
  it('keeps watched codes in selected order and limits the status bar to eight items', () => {
    expect(normalizeStatusBarCodes(
      ['hk00700', 'sh000001', 'hk00700', 'missing', 'sz000001', 'usr_aapl', 'sh600519'],
      ['sh000001', 'sz000001', 'hk00700', 'usr_aapl', 'sh600519']
    )).toEqual(['hk00700', 'sh000001', 'sz000001', 'usr_aapl', 'sh600519']);
  });
});


