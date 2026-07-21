import { DEFAULT_PERSONALIZATION, PersonalizationConfig } from './personalizationModel';

export interface PersonalizationViewState extends PersonalizationConfig {
  heldStockHighlightEnabled: boolean;
  remindersEnabled: boolean;
  marketHoursEnabled: boolean;
  stockChartMode: 'standard' | 'chips';
  showMarketStatusBar: boolean;
  showStockPortfolioStatusBar: boolean;
  showFundPortfolioStatusBar: boolean;
  showStatusBarIcons: boolean;
  statusBarStocks: string[];
  availableStocks: readonly PersonalizationStockOption[];
}

export interface PersonalizationStockOption {
  code: string;
  name: string;
}

export function renderPersonalizationPage(state: PersonalizationViewState, nonce: string): string {
  const serialized = JSON.stringify(state).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}[hidden]{display:none!important}body{max-width:880px;margin:0 auto;padding:22px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}h1{margin:0 0 20px;font-size:21px}section{padding:16px 0;border-top:1px solid var(--vscode-panel-border)}h2{margin:0 0 12px;font-size:15px}.row{display:grid;grid-template-columns:minmax(180px,240px) minmax(0,1fr);align-items:center;gap:14px;min-height:40px}.row label{font-weight:500}.field,select{width:100%;min-height:30px;padding:4px 8px;border:1px solid var(--vscode-input-border);border-radius:3px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);font:inherit}.toggle{width:18px;height:18px;justify-self:start}.colors{display:grid;grid-template-columns:1fr 1fr;gap:10px}.color{display:grid;grid-template-columns:34px 1fr;align-items:center;gap:8px}.color input[type=color]{width:34px;height:28px;padding:1px;border:1px solid var(--vscode-input-border);background:transparent}.actions{position:sticky;bottom:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 0;background:var(--vscode-editor-background)}button{min-height:32px;padding:5px 13px;border:1px solid transparent;border-radius:3px;font:inherit;cursor:pointer}.primary{color:var(--vscode-button-foreground);background:var(--vscode-button-background)}.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}#status{margin-right:auto;color:var(--vscode-descriptionForeground)}.templates.disabled{opacity:.55}.templates.disabled input{pointer-events:none}.stock-config{display:flex;align-items:center;justify-content:space-between;gap:12px}.stock-config span{color:var(--vscode-descriptionForeground)}.modal-shell{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.48)}.modal{width:min(560px,100%);max-height:min(680px,calc(100vh - 36px));display:flex;flex-direction:column;padding:18px;border:1px solid var(--vscode-widget-border,var(--vscode-panel-border));border-radius:7px;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));box-shadow:0 10px 32px rgba(0,0,0,.32)}.modal h2{margin:0 0 6px}.modal-description{margin:0 0 13px;color:var(--vscode-descriptionForeground);font-size:12px;line-height:1.5}.stock-summary{display:flex;justify-content:space-between;color:var(--vscode-descriptionForeground);font-size:12px;margin:0 0 7px}.stock-chips{display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:10px}.stock-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:14px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);cursor:grab}.stock-chip.dragging{opacity:.45}.stock-chip button{min-height:auto;padding:0;border:0;background:transparent;color:inherit;font-size:14px}.stock-list{min-height:120px;max-height:290px;overflow:auto;margin-top:8px;border-radius:5px;background:var(--vscode-input-background)}.stock-option{display:flex;align-items:center;gap:9px;padding:8px 10px}.stock-option:hover{background:var(--vscode-list-hoverBackground)}.stock-option input{accent-color:var(--vscode-focusBorder)}.stock-option .code{margin-left:auto;color:var(--vscode-descriptionForeground);font-size:11px}.stock-empty{padding:15px;color:var(--vscode-descriptionForeground);text-align:center}.modal-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--vscode-panel-border)}.modal-actions .clear{margin-right:auto;padding-left:0;color:var(--vscode-textLink-foreground);background:transparent}@media(max-width:620px){body{padding:14px}.row{grid-template-columns:1fr;gap:5px;padding:6px 0}.colors{grid-template-columns:1fr}.actions{padding-bottom:8px}.modal{padding:14px}}
    .field-with-tools{display:flex;gap:4px}.field-with-tools .field{flex:1;min-width:0}.template-tool{width:30px;min-width:30px;padding:3px;color:var(--vscode-descriptionForeground);background:var(--vscode-button-secondaryBackground)}
  </style></head><body><h1>&#20010;&#24615;&#23450;&#21046;</h1><form id="form">
    <section><h2>&#20391;&#36793;&#26639;</h2>
      ${selectRow('sidebarDisplayMode', '&#26174;&#31034;&#27169;&#24335;', [['standard', '&#26631;&#20934;'], ['template', '&#33258;&#23450;&#20041;&#27169;&#26495;']], state.sidebarDisplayMode)}
      ${selectRow('changeIconStyle', '&#28072;&#36300;&#22270;&#26631;', [['arrow', '&#31661;&#22836;&#65288;&#32418;&#28072;&#32511;&#36300;&#65289;'], ['arrow1', '&#31661;&#22836;&#65288;&#32511;&#28072;&#32418;&#36300;&#65289;'], ['food1', '&#39135;&#29289; 1'], ['food2', '&#39135;&#29289; 2'], ['food3', '&#39135;&#29289; 3'], ['iconfood', 'Emoji &#39135;&#29289;'], ['none', '&#26080;']], state.changeIconStyle)}
      <div class="templates" id="templates">
        ${inputRow('stockLabelTemplate', '&#32929;&#31080;&#27169;&#26495;', state.stockLabelTemplate, '&#21487;&#29992;&#21464;&#37327;: ${icon} ${percent} ${price} ${name} ${code} ${change} ${earnings}', DEFAULT_PERSONALIZATION.stockLabelTemplate)}
        ${inputRow('fundLabelTemplate', '&#22522;&#37329;&#27169;&#26495;', state.fundLabelTemplate, '&#21487;&#29992;&#21464;&#37327;: ${icon} ${percent} ${nav} ${price} ${name} ${code} ${earnings} ${time}', DEFAULT_PERSONALIZATION.fundLabelTemplate)}
      </div>
      ${checkboxRow('heldStockHighlightEnabled', '&#25345;&#20179;&#39640;&#20142;', state.heldStockHighlightEnabled)}
    </section>
    <section><h2>&#29366;&#24577;&#26639;</h2>
      ${inputRow('statusBarLabelTemplate', '&#34892;&#24773;&#27169;&#26495;', state.statusBarLabelTemplate, '&#21487;&#29992;&#21464;&#37327;: ${icon} ${name} ${code} ${price} ${percent} ${change}', DEFAULT_PERSONALIZATION.statusBarLabelTemplate)}
      ${inputRow('stockPortfolioTemplate', '&#32929;&#31080;&#25910;&#30410;&#27169;&#26495;', state.stockPortfolioTemplate, '&#21487;&#29992;&#21464;&#37327;: ${icon} ${name} ${currency} ${marketValue} ${costBasis} ${totalProfit} ${totalPercent} ${todayProfit} ${todayPercent} ${warning}', DEFAULT_PERSONALIZATION.stockPortfolioTemplate)}
      ${inputRow('fundPortfolioTemplate', '&#22522;&#37329;&#25910;&#30410;&#27169;&#26495;', state.fundPortfolioTemplate, '&#21487;&#29992;&#21464;&#37327;: ${icon} ${name} ${currency} ${marketValue} ${costBasis} ${totalProfit} ${totalPercent} ${todayProfit} ${todayPercent} ${warning}', DEFAULT_PERSONALIZATION.fundPortfolioTemplate)}
      ${checkboxRow('showStatusBarIcons', '&#26174;&#31034;&#22270;&#26631;', state.showStatusBarIcons)}
      ${checkboxRow('showMarketStatusBar', '&#34892;&#24773;&#29366;&#24577;&#26639;', state.showMarketStatusBar)}
      ${checkboxRow('showStockPortfolioStatusBar', '&#32929;&#31080;&#25345;&#20179;&#29366;&#24577;&#26639;', state.showStockPortfolioStatusBar)}
      ${checkboxRow('showFundPortfolioStatusBar', '&#22522;&#37329;&#25345;&#20179;&#29366;&#24577;&#26639;', state.showFundPortfolioStatusBar)}
      <div class="row"><label for="configure-status-stocks">&#29366;&#24577;&#26639;&#32929;&#31080;</label><div class="stock-config"><span id="stock-selection-summary"></span><button class="secondary" id="configure-status-stocks" type="button">&#37197;&#32622;</button></div></div>
      ${checkboxRow('useCustomStatusBarColors', '&#33258;&#23450;&#20041;&#28072;&#36300;&#39068;&#33394;', state.useCustomStatusBarColors)}
      <div class="row"><label>&#39068;&#33394;</label><div class="colors"><div class="color"><input id="riseColor" type="color" value="${escapeHtml(state.riseColor)}"><span>&#19978;&#28072;</span></div><div class="color"><input id="fallColor" type="color" value="${escapeHtml(state.fallColor)}"><span>&#19979;&#36300;</span></div></div></div>
    </section>
    <section><h2>&#34892;&#20026;</h2>
      ${selectRow('stockChartMode', 'K &#32447;&#40664;&#35748;&#27169;&#24335;', [['standard', '&#24120;&#35268;'], ['chips', '&#31609;&#30721;&#20998;&#24067;']], state.stockChartMode)}
      ${checkboxRow('remindersEnabled', '&#32929;&#31080;&#25552;&#37266;', state.remindersEnabled)}
      ${checkboxRow('marketHoursEnabled', '&#20165;&#20132;&#26131;&#26102;&#27573;&#33258;&#21160;&#21047;&#26032;', state.marketHoursEnabled)}
    </section>
    <div class="actions"><span id="status"></span><button class="secondary" id="reset" type="button">&#24674;&#22797;&#40664;&#35748;</button><button class="primary" type="submit">&#20445;&#23384;</button></div>
  </form><div class="modal-shell" id="stock-modal" hidden><div class="modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
    <h2 id="stock-modal-title">&#29366;&#24577;&#26639;&#32929;&#31080;</h2>
    <p class="modal-description">&#20174;&#33258;&#36873;&#32929;&#20013;&#36873;&#25321;&#26368;&#22810; 8 &#21482;&#26174;&#31034;&#22312; VS Code &#24213;&#37096;&#29366;&#24577;&#26639;&#12290;&#25302;&#25341;&#24050;&#36873;&#32929;&#31080;&#21487;&#35843;&#25972;&#39034;&#24207;&#12290;</p>
    <div class="stock-summary"><span>&#24050;&#36873; <b id="stock-count"></b>/8</span><span>&#25903;&#25345;&#25628;&#32034;&#21517;&#31216;&#25110;&#20195;&#30721;</span></div>
    <div id="stock-chips" class="stock-chips" aria-label="&#24050;&#36873;&#29366;&#24577;&#26639;&#32929;&#31080;"></div>
    <input class="field" id="stock-search" placeholder="&#25628;&#32034;&#33258;&#36873;&#32929;..." autocomplete="off">
    <div id="stock-list" class="stock-list"></div>
    <div class="modal-actions"><button class="clear" id="clear-status-stocks" type="button">&#28165;&#31354;&#36873;&#25321;</button><button class="secondary" id="cancel-status-stocks" type="button">&#21462;&#28040;</button><button class="primary" id="apply-status-stocks" type="button">&#20445;&#23384;</button></div>
  </div></div><script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const initial=${serialized};const form=document.getElementById('form');const status=document.getElementById('status');
    const ids=['sidebarDisplayMode','changeIconStyle','stockLabelTemplate','fundLabelTemplate','heldStockHighlightEnabled','statusBarLabelTemplate','stockPortfolioTemplate','fundPortfolioTemplate','showStatusBarIcons','showMarketStatusBar','showStockPortfolioStatusBar','showFundPortfolioStatusBar','useCustomStatusBarColors','riseColor','fallColor','stockChartMode','remindersEnabled','marketHoursEnabled'];let selected=[...initial.statusBarStocks];let dragged='';
    const stocks=initial.availableStocks||[];const stockMap=new Map(stocks.map((item)=>[item.code,item]));const chips=document.getElementById('stock-chips');const list=document.getElementById('stock-list');const search=document.getElementById('stock-search');const modal=document.getElementById('stock-modal');let selectionBeforeModal=[];
    function read(){const output={};for(const id of ids){const input=document.getElementById(id);output[id]=input.type==='checkbox'?input.checked:input.value}output.statusBarStocks=selected;return output}
    function write(value){for(const id of ids){const input=document.getElementById(id);if(!input)continue;if(input.type==='checkbox')input.checked=Boolean(value[id]);else input.value=value[id]}selected=[...(value.statusBarStocks||[])];renderStocks();sync()}
    function renderStocks(){document.getElementById('stock-count').textContent=selected.length;document.getElementById('stock-selection-summary').textContent=selected.length+' / 8';chips.innerHTML='';selected.forEach((code)=>{const item=stockMap.get(code)||{code,name:code};const chip=document.createElement('span');chip.className='stock-chip';chip.draggable=true;chip.dataset.code=code;chip.textContent=item.name+' ';const remove=document.createElement('button');remove.type='button';remove.textContent='\u00d7';remove.title='移除';remove.addEventListener('click',()=>toggle(code,false));chip.appendChild(remove);chip.addEventListener('dragstart',(event)=>{dragged=code;event.dataTransfer.setData('text/plain',code);event.dataTransfer.effectAllowed='move';chip.classList.add('dragging')});chip.addEventListener('dragend',()=>{dragged='';chip.classList.remove('dragging')});chips.appendChild(chip)});const query=search.value.trim().toLowerCase();const visible=stocks.filter((item)=>!query||item.name.toLowerCase().includes(query)||item.code.toLowerCase().includes(query));list.innerHTML='';if(!visible.length){list.innerHTML='<div class="stock-empty">没有匹配的股票</div>';return}visible.forEach((item)=>{const label=document.createElement('label');label.className='stock-option';const input=document.createElement('input');input.type='checkbox';input.checked=selected.includes(item.code);input.addEventListener('change',()=>toggle(item.code,input.checked));const name=document.createElement('span');name.textContent=item.name;const code=document.createElement('span');code.className='code';code.textContent=item.code;label.append(input,name,code);list.appendChild(label)})}
    function toggle(code,checked){if(checked&&!selected.includes(code)){if(selected.length>=8){status.textContent='最多选择 8 只股票';renderStocks();return}selected.push(code)}else if(!checked)selected=selected.filter((item)=>item!==code);status.textContent='';renderStocks()}
    function closeStockModal(restore){if(restore)selected=[...selectionBeforeModal];modal.hidden=true;renderStocks()}
    chips.addEventListener('dragover',(event)=>event.preventDefault());chips.addEventListener('drop',(event)=>{event.preventDefault();const target=event.target.closest('.stock-chip');if(!dragged)return;const from=selected.indexOf(dragged);const to=target?selected.indexOf(target.dataset.code):selected.length-1;if(from<0||to<0||from===to)return;selected.splice(from,1);selected.splice(to,0,dragged);dragged='';renderStocks()});search.addEventListener('input',renderStocks);document.getElementById('configure-status-stocks').addEventListener('click',()=>{selectionBeforeModal=[...selected];search.value='';modal.hidden=false;renderStocks();search.focus()});document.getElementById('clear-status-stocks').addEventListener('click',()=>{selected=[];renderStocks()});document.getElementById('cancel-status-stocks').addEventListener('click',()=>closeStockModal(true));document.getElementById('apply-status-stocks').addEventListener('click',()=>{closeStockModal(false);vscode.postMessage({type:'saveStatusBarStocks',value:selected})});modal.addEventListener('click',(event)=>{if(event.target===modal)closeStockModal(true)});document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!modal.hidden)closeStockModal(true)});
    function sync(){document.getElementById('templates').classList.toggle('disabled',document.getElementById('sidebarDisplayMode').value!=='template')}
    form.addEventListener('submit',(event)=>{event.preventDefault();status.textContent='';vscode.postMessage({type:'save',value:read()})});
    document.querySelectorAll('[data-template-reset]').forEach((button)=>button.addEventListener('click',()=>{document.getElementById(button.dataset.templateReset).value=button.dataset.default;status.textContent=''}));document.getElementById('reset').addEventListener('click',()=>vscode.postMessage({type:'reset'}));document.getElementById('sidebarDisplayMode').addEventListener('change',sync);renderStocks();sync();
    window.addEventListener('message',(event)=>{if(event.data.type==='saved'||event.data.type==='statusBarStocksSaved')status.textContent='已保存';if(event.data.type==='state')write(event.data.value);if(event.data.type==='error')status.textContent=event.data.message});
  </script></body></html>`;
}

function inputRow(id: string, label: string, value: string, hint?: string, defaultValue?: string): string {
  if (!hint) return `<div class="row"><label for="${id}">${label}</label><input class="field" id="${id}" value="${escapeHtml(value)}" maxlength="240"></div>`;
  return `<div class="row"><label for="${id}">${label}</label><div class="field-with-tools"><input class="field" id="${id}" value="${escapeHtml(value)}" maxlength="240"><button class="template-tool" type="button" title="${hint}" aria-label="${hint}">&#9432;</button><button class="template-tool" type="button" data-template-reset="${id}" data-default="${escapeHtml(defaultValue ?? value)}" title="&#24674;&#22797;&#40664;&#35748;" aria-label="&#24674;&#22797;&#40664;&#35748;">&#8635;</button></div></div>`;
}

function checkboxRow(id: string, label: string, checked: boolean): string {
  return `<div class="row"><label for="${id}">${label}</label><input class="toggle" id="${id}" type="checkbox"${checked ? ' checked' : ''}></div>`;
}

function selectRow(id: string, label: string, options: readonly (readonly [string, string])[], value: string): string {
  return `<div class="row"><label for="${id}">${label}</label><select id="${id}">${options.map(([key, text]) => `<option value="${key}"${key === value ? ' selected' : ''}>${text}</option>`).join('')}</select></div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
