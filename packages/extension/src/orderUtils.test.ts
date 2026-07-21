import { describe, expect, it } from 'vitest';
import { moveCode } from './orderUtils';

describe('moveCode', () => {
  it('moves items without mutating the source', () => {
    const source = ['a', 'b', 'c'];
    expect(moveCode(source, 'c', 'top')).toEqual(['c', 'a', 'b']);
    expect(moveCode(source, 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(moveCode(source, 'b', 'down')).toEqual(['a', 'c', 'b']);
    expect(source).toEqual(['a', 'b', 'c']);
  });

  it('keeps boundary and unknown items stable', () => {
    expect(moveCode(['a', 'b'], 'a', 'up')).toEqual(['a', 'b']);
    expect(moveCode(['a', 'b'], 'x', 'top')).toEqual(['a', 'b']);
  });
});
