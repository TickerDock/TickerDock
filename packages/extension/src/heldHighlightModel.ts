export interface HighlightedLabel {
  label: string;
  highlights?: Array<[number, number]>;
}

export function heldPositionLabel(
  label: string,
  hasPosition: boolean,
  enabled: boolean
): string | HighlightedLabel {
  return hasPosition && enabled
    ? { label, highlights: [[0, label.length]] }
    : label;
}
