import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AiResultPage } from '../../src/pages/AiResultPage';

describe('AI result page', () => {
  afterEach(cleanup);
  it('renders model output as text instead of executable markup', () => {
    render(<AiResultPage title="AI 分析" result={'结论\n<script>bad()</script>'} />);
    expect(screen.getByText('AI 分析')).toBeInTheDocument();
    expect(screen.getByText(/<script>bad\(\)<\/script>/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});


