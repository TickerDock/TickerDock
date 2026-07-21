export interface ChartResources { scriptUri: string; cspSource: string; }

export function chartElement(id: string, option: unknown, label: string): string {
  const configId = `${id}-option`;
  const serialized = JSON.stringify(option).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, ' ');
  return `<div id="${id}" class="echart" data-echart="${configId}" role="img" aria-label="${escapeHtml(label)}"></div><script id="${configId}" type="application/json">${serialized}</script>`;
}

export function chartCsp(resources: ChartResources | undefined): string {
  return resources ? ` ${escapeHtml(resources.cspSource)}` : '';
}

export function chartRuntime(resources: ChartResources | undefined, nonce: string): string {
  return resources ? `<script nonce="${nonce}" src="${escapeHtml(resources.scriptUri)}"></script>` : '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
