export const WEBVIEW_PROTOCOL_VERSION = 1;

export function readWebviewEnvelope(value: unknown, type: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const message = value as Record<string, unknown>;
  if (message.version !== WEBVIEW_PROTOCOL_VERSION || message.type !== type || typeof message.requestId !== 'string') return undefined;
  return message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)
    ? message.payload as Record<string, unknown>
    : undefined;
}
