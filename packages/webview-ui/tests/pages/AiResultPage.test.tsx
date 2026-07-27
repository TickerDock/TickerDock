import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AiResultPage } from '../../src/pages/AiResultPage';

describe('AI result page', () => {
  afterEach(cleanup);
  it('renders Markdown as rich content without executing embedded HTML', () => {
    render(<AiResultPage title="AI 分析" result={'# 结论\n\n- 趋势向上\n- 注意风险\n\n| 指标 | 数值 |\n| --- | --- |\n| 动量 | 强 |\n\n<script>bad()</script>'} />);
    expect(screen.getByText('AI 分析')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '结论' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});


