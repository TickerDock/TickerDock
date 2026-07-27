import { useEffect, useRef, type ReactElement } from 'react';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { BarChart, CandlestickChart, LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, CandlestickChart, LineChart, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

export function EChart({ option, label, className = '' }: { option: EChartsCoreOption; label: string; className?: string }): ReactElement {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return;
    const chart = echarts.init(element.current, chartTheme(), { renderer: 'svg' });
    chart.setOption(resolveThemeTokens(option) as EChartsCoreOption, { notMerge: true });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize());
    observer?.observe(element.current);
    return () => { observer?.disconnect(); chart.dispose(); };
  }, [option]);
  return <div ref={element} className={`echart ${className}`.trim()} role="img" aria-label={label} />;
}

function chartTheme(): object {
  return {
    color: [color('--vscode-charts-blue', '#3794ff'), color('--vscode-charts-red', '#f14c4c'), color('--vscode-charts-green', '#89d185'), color('--vscode-charts-purple', '#b180d7'), color('--vscode-charts-orange', '#d18616'), color('--vscode-charts-yellow', '#cca700')],
    textStyle: { color: color('--vscode-foreground', '#cccccc'), fontFamily: color('--vscode-font-family', 'sans-serif') },
    line: { itemStyle: { borderWidth: 2 }, symbolSize: 5 },
    categoryAxis: axis(), valueAxis: axis(),
  };
}

function axis(): object {
  return { axisLine: { lineStyle: { color: color('--vscode-panel-border', '#555555') } }, axisTick: { lineStyle: { color: color('--vscode-panel-border', '#555555') } }, axisLabel: { color: color('--vscode-descriptionForeground', '#999999') }, splitLine: { lineStyle: { color: color('--vscode-panel-border', '#555555'), opacity: .45 } } };
}

function color(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function resolveThemeTokens(value: unknown): unknown {
  if (value === '$chart-rise') return color('--vscode-charts-red', '#f14c4c');
  if (value === '$chart-fall') return color('--vscode-charts-green', '#89d185');
  if (value === '$chart-flat') return color('--vscode-charts-yellow', '#cca700');
  if (Array.isArray(value)) return value.map(resolveThemeTokens);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveThemeTokens(item)]));
  return value;
}
