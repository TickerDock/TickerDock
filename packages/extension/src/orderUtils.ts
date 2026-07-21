export function moveCode(
  codes: readonly string[],
  code: string,
  direction: 'top' | 'up' | 'down'
): string[] {
  const result = [...codes];
  const index = result.indexOf(code);
  if (index < 0) return result;
  const target = direction === 'top'
    ? 0
    : direction === 'up'
      ? Math.max(0, index - 1)
      : Math.min(result.length - 1, index + 1);
  if (target === index) return result;
  result.splice(index, 1);
  result.splice(target, 0, code);
  return result;
}
