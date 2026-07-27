import { describe, expect, it } from 'vitest';
import { normalizeStatusBarCodes } from '../src/statusBarModel';

describe('status bar model', () => {
  it('keeps watched stocks in the selected order and limits the result to eight', () => {
    const watched = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

    expect(normalizeStatusBarCodes(['c', 'a', 'c', 'missing', 'b'], watched)).toEqual(['c', 'a', 'b']);
    expect(normalizeStatusBarCodes(watched, watched)).toEqual(watched.slice(0, 8));
  });
});


