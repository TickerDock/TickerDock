export function aiResearchTitle(prompt: string, maximumLength = 80): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximumLength) return `AI Research: ${normalized}`;
  return `AI Research: ${normalized.slice(0, Math.max(1, maximumLength - 3))}...`;
}

export function formatAiOutputEntry(title: string, result: string, timestamp: Date): string {
  return [
    `==== ${title} ====`,
    timestamp.toLocaleString(),
    '',
    result.trim(),
    '',
    '-'.repeat(72),
  ].join('\n');
}
