import type { ReactElement } from 'react';

export function AiResultPage({ title, result }: { title: string; result: string }): ReactElement {
  return <main className="ai-result-page"><h1>{title}</h1><pre>{result}</pre></main>;
}
