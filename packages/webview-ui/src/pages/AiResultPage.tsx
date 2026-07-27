import type { ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AiResultPage({ title, result }: { title: string; result: string }): ReactElement {
  return <main className="ai-result-page"><h1>{title}</h1><article className="ai-result-content"><Markdown remarkPlugins={[remarkGfm]}>{result}</Markdown></article></main>;
}
