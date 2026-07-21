export function normalizeStatusBarCodes(codes: readonly string[], watched: readonly string[]): string[] {
  const watchedSet = new Set(watched);
  return [...new Set(codes)].filter((code) => watchedSet.has(code)).slice(0, 8);
}
