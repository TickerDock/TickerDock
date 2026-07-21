import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

const rootStyle = getComputedStyle(document.documentElement);
const color = (name: string, fallback: string) => rootStyle.getPropertyValue(name).trim() || fallback;
const foreground = color('--vscode-foreground', '#333333');
const muted = color('--vscode-descriptionForeground', '#777777');
const border = color('--vscode-panel-border', '#cccccc');
const background = color('--vscode-editor-background', '#ffffff');
const palette = [
  color('--vscode-charts-blue', '#3794ff'), color('--vscode-charts-red', '#f14c4c'),
  color('--vscode-charts-green', '#89d185'), color('--vscode-charts-purple', '#b180d7'),
  color('--vscode-charts-orange', '#d18616'), color('--vscode-charts-yellow', '#cca700'),
];
const axis = {
  axisLine: { lineStyle: { color: border } }, axisTick: { lineStyle: { color: border } },
  axisLabel: { color: muted }, splitLine: { lineStyle: { color: border, opacity: 0.35 } },
};
const theme = {
  color: palette, backgroundColor: 'transparent', textStyle: { color: foreground },
  legend: { textStyle: { color: foreground } }, categoryAxis: axis, valueAxis: axis,
  tooltip: { backgroundColor: background, borderColor: border, textStyle: { color: foreground } },
};
const themeTokens: Record<string, string> = {
  '$chart-rise': color('--vscode-charts-red', '#f14c4c'),
  '$chart-fall': color('--vscode-charts-green', '#89d185'),
  '$chart-flat': color('--vscode-charts-yellow', '#cca700'),
};

document.querySelectorAll<HTMLElement>('[data-echart]').forEach((element) => {
  const config = element.dataset.echart ? document.getElementById(element.dataset.echart) : undefined;
  if (!config?.textContent) return;
  try {
    const chart = echarts.init(element, theme, { renderer: 'svg' });
    chart.setOption(resolveThemeTokens(JSON.parse(config.textContent)), { notMerge: true });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    window.addEventListener('unload', () => { observer.disconnect(); chart.dispose(); }, { once: true });
  } catch (error) {
    element.textContent = `Chart unavailable: ${error instanceof Error ? error.message : String(error)}`;
    element.classList.add('chart-error');
  }
});

function resolveThemeTokens<T>(value: T): T {
  if (typeof value === 'string') return (themeTokens[value] ?? value) as T;
  if (Array.isArray(value)) return value.map(resolveThemeTokens) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveThemeTokens(item)])) as T;
}
