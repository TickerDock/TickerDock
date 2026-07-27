import { useEffect, useRef, type ReactElement } from 'react';
import type { EChartsCoreOption } from 'echarts/core';

export function EChart({ option, label, className = '' }: { option: EChartsCoreOption; label: string; className?: string }): ReactElement {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return;
    const target = element.current;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void import('../chartRuntime').then(({ mountChart }) => {
      if (!disposed) cleanup = mountChart(target, option);
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [option]);
  return <div ref={element} className={`echart ${className}`.trim()} role="img" aria-label={label} />;
}
