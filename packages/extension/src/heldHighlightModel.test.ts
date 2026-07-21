import { describe, expect, it } from 'vitest';
import { heldPositionLabel } from './heldHighlightModel';

describe('held position highlight', () => {
  it('highlights the complete label only for enabled held positions', () => {
    expect(heldPositionLabel('Example', true, true)).toEqual({
      label: 'Example', highlights: [[0, 7]],
    });
    expect(heldPositionLabel('Example', false, true)).toBe('Example');
    expect(heldPositionLabel('Example', true, false)).toBe('Example');
  });
});
