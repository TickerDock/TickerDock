import type { FundQuote, StockQuote } from '@stock-fund/domain';

export interface LeekCenterWatchlistData {
  stocks: Array<{ name: string; items: StockQuote[] }>;
  funds: Array<{ name: string; items: FundQuote[] }>;
  updatedAt: number;
}

export const LEEK_CENTER_TABS = [
  { id: 'data-center', title: '数据中心' },
  { id: 'watchlist', title: '我的自选' },
] as const;

export interface LeekCenterPage {
  id: string;
  title: string;
  description: string;
  group: 'Market' | 'Trading' | 'Issuance' | 'Research';
  url: string;
}

export const LEEK_CENTER_PAGES: readonly LeekCenterPage[] = [
  {
    id: 'bull-bear',
    title: '选股通盯盘',
    description: '',
    group: 'Market',
    url: 'https://xuangutong.com.cn/dingpan',
  },
  {
    id: 'wind-vane',
    title: '股票风向标',
    description: '题材、行业与市场情绪概览',
    group: 'Market',
    url: 'https://quote.eastmoney.com/zhuti/#ggfxb',
  },
  {
    id: 'northbound-flow',
    title: '沪深港通资金流',
    description: '沪股通、深股通和港股通资金流向',
    group: 'Market',
    url: 'https://emrnweb.eastmoney.com/hsgt/home',
  },
  {
    id: 'main-capital-flow',
    title: '主力资金流',
    description: '全市场主力资金流入流出',
    group: 'Market',
    url: 'https://emdatah5.eastmoney.com/dc/zjlx/index',
  },
  {
    id: 'capital-dashboard',
    title: '资金流看板',
    description: '交互式板块资金流看板',
    group: 'Market',
    url: 'https://view.le5le.com/v/?id=019749ca-8bc5-786f-aa04-913e3c62bea8',
  },
  {
    id: 'dragon-tiger',
    title: '龙虎榜',
    description: '每日异动席位与交易明细',
    group: 'Trading',
    url: 'https://datapc.eastmoney.com/emdatacenter/Ranking/Index?color=b',
  },
  {
    id: 'block-trades',
    title: '大宗交易',
    description: '大额协议股票交易',
    group: 'Trading',
    url: 'https://datapc.eastmoney.com/emdatacenter/dzjy/index?color=b',
  },
  {
    id: 'margin',
    title: '融资融券',
    description: '融资买入与融券卖出数据',
    group: 'Trading',
    url: 'https://datapc.eastmoney.com/emdatacenter/rzrq/index?market=sh&color=b',
  },
  {
    id: 'executive-holdings',
    title: '高管持股',
    description: '高管及重要股东持股变动',
    group: 'Trading',
    url: 'https://datapc.eastmoney.com/emdatacenter/ggcg/index?color=b',
  },
  {
    id: 'ipo-subscription',
    title: '新股申购',
    description: '即将发行股票的申购信息',
    group: 'Issuance',
    url: 'https://datapc.eastmoney.com/da/Purchase/Index?color=b',
  },
  {
    id: 'ipo-calendar',
    title: '新股日历',
    description: '上市与申购日期安排',
    group: 'Issuance',
    url: 'https://datapc.eastmoney.com/da/calendar/index?color=b',
  },
  {
    id: 'additional-issuance',
    title: '增发',
    description: '定向及公开增发信息',
    group: 'Issuance',
    url: 'https://datapc.eastmoney.com/da/Issuance/Index?color=b',
  },
  {
    id: 'rights-issues',
    title: '配股',
    description: '上市公司配股记录',
    group: 'Issuance',
    url: 'https://datapc.eastmoney.com/da/AllottedShares/Index?color=b',
  },
  {
    id: 'research',
    title: '研报中心',
    description: '券商研报报告与评级',
    group: 'Research',
    url: 'https://eminfo.eastmoney.com/pc_news/research/index?color=b',
  },
  {
    id: 'macro-economy',
    title: '宏观经济',
    description: '国内宏观经济指标',
    group: 'Research',
    url: 'https://datapc.eastmoney.com/emdatacenter/economy/Index?color=b',
  },
];

export function getLeekCenterPage(id: string): LeekCenterPage | undefined {
  return LEEK_CENTER_PAGES.find((page) => page.id === id);
}

export function renderLeekCenterHtml(
  nonce: string,
  requestedPageId?: string,
  eastMoneyOrigin = 'https://quote.eastmoney.com',
  watchlist: LeekCenterWatchlistData = { stocks: [], funds: [], updatedAt: Date.now() },
  tokenModuleUri = '',
  cspSource = ''
): string {
  const explicitPage = requestedPageId !== undefined && getLeekCenterPage(requestedPageId) !== undefined;
  const initialPageId = explicitPage ? requestedPageId : 'bull-bear';
  const groups = ['Market', 'Trading', 'Issuance', 'Research'] as const;
  const groupLabels: Record<typeof groups[number], string> = {
    Market: '行情', Trading: '交易', Issuance: '发行', Research: '研报',
  };
  const navigation = groups.map((group) => `
    <section class="nav-group">
      <h2>${groupLabels[group]}</h2>
      ${LEEK_CENTER_PAGES.filter((page) => page.group === group).map((page, index) => `
        <button class="nav-item${page.id === initialPageId ? ' active' : ''}" data-page="${page.id}" type="button">
          <span>${page.title}</span><small>${page.description}</small>
        </button>`).join('')}
    </section>`).join('');
  const pages = LEEK_CENTER_PAGES.map((page) => page.id === 'wind-vane'
    ? { ...page, url: `${eastMoneyOrigin}/zhuti/#ggfxb` }
    : page);
  const pageData = JSON.stringify(Object.fromEntries(pages.map((page) => [page.id, page]))).replace(/</g, '\\u003c');
  const watchlistData = JSON.stringify(watchlist).replace(/</g, '\\u003c');
  const frameOrigins = [...new Set(pages.map((page) => new URL(page.url).origin))].join(' ');
  const tabs = LEEK_CENTER_TABS.map((tab, index) => `<button class="top-tab${index === 0 ? ' active' : ''}" data-tab="${tab.id}" type="button">${tab.title}</button>`).join('');
  const tokenImport = tokenModuleUri
    ? `import {getHexinToken} from ${JSON.stringify(tokenModuleUri)};`
    : 'const getHexinToken=()=>undefined;';

  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource}; frame-src ${frameOrigins}; img-src data:;">
  <style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-editor-background);overflow:hidden}
    button{font:inherit}.app{display:grid;grid-template-rows:42px minmax(0,1fr);height:100vh;min-height:0}.top-tabs{display:flex;align-items:end;gap:2px;padding:0 12px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editorGroupHeader-tabsBackground);overflow-x:auto}.top-tab{position:relative;height:41px;padding:0 18px;border:0;color:var(--vscode-tab-inactiveForeground);background:transparent;cursor:pointer;white-space:nowrap}.top-tab:hover{color:var(--vscode-tab-activeForeground);background:var(--vscode-tab-hoverBackground)}.top-tab.active{color:var(--vscode-tab-activeForeground);background:var(--vscode-tab-activeBackground)}.top-tab.active:after{position:absolute;right:0;bottom:0;left:0;height:2px;background:var(--vscode-focusBorder);content:""}.tab-panel{display:none;width:100%;height:100%;min-height:0;overflow:hidden}.tab-panel.active{display:block}.shell{display:grid;grid-template-columns:236px minmax(0,1fr);height:100%;min-height:0}.sidebar{overflow:auto;border-right:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background);padding:12px 8px 24px}.brand{padding:8px 10px 14px;font-size:17px;font-weight:600}.nav-group{margin:4px 0 14px}.nav-group h2{margin:0 10px 5px;color:var(--vscode-descriptionForeground);font-size:11px;font-weight:600}.nav-item{display:block;width:100%;min-height:48px;padding:7px 10px;border:0;border-left:2px solid transparent;text-align:left;color:var(--vscode-sideBar-foreground);background:transparent;cursor:pointer}.nav-item:hover{background:var(--vscode-list-hoverBackground)}.nav-item.active{border-left-color:var(--vscode-focusBorder);background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground)}.nav-item span,.nav-item small{display:block;overflow:hidden;text-overflow:ellipsis}.nav-item span{font-weight:500}.nav-item small{margin-top:2px;color:var(--vscode-descriptionForeground);white-space:normal;line-height:1.25}
    .workspace{display:grid;grid-template-rows:54px minmax(0,1fr);min-width:0}.toolbar{display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editorGroupHeader-tabsBackground)}.title{min-width:0;flex:1}.title strong,.title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.title span{color:var(--vscode-descriptionForeground);font-size:12px}.command{height:30px;padding:0 12px;border:1px solid var(--vscode-button-border,transparent);color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}.command:hover{background:var(--vscode-button-hoverBackground)}.frame-wrap{position:relative;min-height:0;background:var(--vscode-editor-background)}iframe{display:block;width:100%;height:100%;border:0;background:white}.state{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--vscode-descriptionForeground);background:var(--vscode-editor-background);z-index:2}.state.hidden{display:none}
    .watch-shell{display:grid;grid-template-columns:230px minmax(0,1fr);width:100%;height:100%;min-height:0;overflow:hidden}.watch-sidebar{display:grid;grid-template-rows:48px minmax(0,1fr);height:100%;min-height:0;overflow:hidden;border-right:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background)}.watch-head{display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid var(--vscode-panel-border);font-weight:600}.icon-command{width:30px;height:30px;border:0;color:var(--vscode-foreground);background:transparent;cursor:pointer;font-size:17px}.icon-command:hover{background:var(--vscode-toolbar-hoverBackground)}.watch-list{min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain}.watch-group-title{position:sticky;top:0;z-index:1;padding:6px 10px;color:var(--vscode-descriptionForeground);background:var(--vscode-sideBarSectionHeader-background);font-size:12px;font-weight:600}.watch-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;width:100%;padding:8px 10px;border:0;border-bottom:1px solid var(--vscode-panel-border);text-align:left;color:var(--vscode-sideBar-foreground);background:transparent;cursor:pointer}.watch-item:hover{background:var(--vscode-list-hoverBackground)}.watch-item.active{background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground)}.watch-name,.watch-code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.watch-code,.watch-change{font-size:11px;color:var(--vscode-descriptionForeground)}.rise{color:var(--vscode-charts-red)}.fall{color:var(--vscode-charts-green)}.watch-detail{width:100%;height:100%;min-width:0;min-height:0;overflow-x:auto;overflow-y:auto;overscroll-behavior:contain}.detail-empty{display:grid;place-items:center;height:100%;color:var(--vscode-descriptionForeground)}.detail-header{padding:16px 20px 12px;border-bottom:1px solid var(--vscode-panel-border)}.detail-title{display:flex;align-items:baseline;gap:8px}.detail-title h1{margin:0;font-size:20px}.detail-title span{color:var(--vscode-descriptionForeground)}.quote-band{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;margin-top:12px;padding:14px;background:var(--vscode-editor-inactiveSelectionBackground)}.quote-price{font-size:30px;font-variant-numeric:tabular-nums}.quote-stats{display:grid;grid-template-columns:repeat(3,minmax(100px,1fr));gap:8px 18px}.stat{white-space:nowrap}.stat b{margin-left:5px;font-weight:500}.detail-body{padding:0 20px 28px}.detail-section,.stock-extended section{padding:18px 0;border-bottom:1px solid var(--vscode-panel-border)}.detail-section h2,.stock-extended h2{margin:0 0 12px;font-size:15px}.metric-grid{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:1px;background:var(--vscode-panel-border)}.metric{min-height:66px;padding:10px;background:var(--vscode-editor-background)}.metric span,.metric strong{display:block}.metric span{margin-bottom:6px;color:var(--vscode-descriptionForeground);font-size:12px}.metric strong{font-size:16px;font-weight:500}.detail-actions{display:flex;gap:8px;padding-top:16px}.empty-group{padding:18px 10px;color:var(--vscode-descriptionForeground);text-align:center}.stock-detail-loading{padding:22px 0;color:var(--vscode-descriptionForeground)}.stock-extended .facts,.stock-extended .levels{display:grid;gap:1px;background:var(--vscode-panel-border)}.stock-extended .facts{grid-template-columns:repeat(5,minmax(0,1fr))}.stock-extended .levels{grid-template-columns:repeat(4,minmax(120px,1fr))}.stock-extended .fact,.stock-extended .level{min-height:66px;padding:10px;background:var(--vscode-editor-background)}.stock-extended .label,.stock-extended .value{display:block}.stock-extended .label{margin-bottom:6px;color:var(--vscode-descriptionForeground);font-size:12px}.stock-extended .value{font-size:16px}.stock-extended .note,.stock-extended .empty{color:var(--vscode-descriptionForeground);line-height:1.5}.stock-extended .warning{padding:12px;border-left:3px solid var(--vscode-charts-yellow);background:var(--vscode-textBlockQuote-background)}.stock-extended article{padding:10px 0;border-bottom:1px solid var(--vscode-panel-border)}.stock-extended article h3{margin:0 0 5px;font-size:14px}.stock-extended article p{margin:4px 0;color:var(--vscode-descriptionForeground);line-height:1.45}.stock-extended table{width:100%;border-collapse:collapse}.stock-extended th,.stock-extended td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);text-align:left}.stock-extended th{color:var(--vscode-descriptionForeground);font-size:12px;font-weight:500}
    .narrow{display:none}@media(max-width:800px){.shell{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.sidebar{display:flex;gap:4px;overflow-x:auto;padding:6px;border-right:0;border-bottom:1px solid var(--vscode-panel-border)}.brand,.nav-group h2,.nav-item small{display:none}.nav-group{display:flex;margin:0}.nav-item{width:auto;min-width:max-content;min-height:34px;padding:7px 10px;border-left:0;border-bottom:2px solid transparent}.nav-item.active{border-bottom-color:var(--vscode-focusBorder)}.workspace{min-height:0}.toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;padding:0 8px;gap:6px}.title span{display:none}.command{padding:0 8px;white-space:nowrap}.wide{display:none}.narrow{display:inline}.watch-shell{grid-template-columns:1fr;grid-template-rows:minmax(180px,38%) minmax(0,1fr)}.watch-sidebar{border-right:0;border-bottom:1px solid var(--vscode-panel-border)}.quote-band{grid-template-columns:1fr;gap:12px}.quote-stats{grid-template-columns:repeat(2,minmax(100px,1fr))}.metric-grid{grid-template-columns:repeat(2,minmax(110px,1fr))}}
  </style></head><body><main class="app"><nav class="top-tabs" aria-label="Leek Center 页面">${tabs}</nav><section id="data-center" class="tab-panel active"><div class="shell"><nav class="sidebar" aria-label="行情中心页面"><div class="brand">行情中心</div>${navigation}</nav><section class="workspace"><header class="toolbar"><div class="title"><strong id="title"></strong><span id="description"></span></div><button id="reload" class="command" type="button">刷新</button><button id="external" class="command" type="button"><span class="wide">打开外部页面</span><span class="narrow">打开</span></button></header><div class="frame-wrap"><div id="state" class="state">正在加载数据页面...</div><iframe id="frame" title="行情中心数据页面" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div></section></div></section><section id="watchlist" class="tab-panel"><div class="watch-shell"><aside class="watch-sidebar"><header class="watch-head"><span>我的自选</span><button id="refresh-watchlist" class="icon-command" type="button" title="刷新自选行情" aria-label="刷新自选行情">↻</button></header><div id="watch-list" class="watch-list"></div></aside><main id="watch-detail" class="watch-detail"><div class="detail-empty">暂无自选数据</div></main></div></section></main>
  <script type="module" nonce="${nonce}">${tokenImport}const canGenerateHexinToken=${tokenModuleUri ? 'true' : 'false'};const vscode=acquireVsCodeApi();const pages=${pageData};let watchlist=${watchlistData};const frame=document.getElementById('frame');const state=document.getElementById('state');const title=document.getElementById('title');const description=document.getElementById('description');const watchList=document.getElementById('watch-list');const watchDetail=document.getElementById('watch-detail');const stockDetails=new Map();const loadingDetails=new Set();let hexinToken;let current=${JSON.stringify(initialPageId)};let selected='';let timeout;
    const esc=(value)=>String(value??'--').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));const price=(value)=>Number.isFinite(value)?Number(value).toFixed(value>=100?2:4).replace(/0+$/,'').replace(/\.$/,''):'--';const percent=(value)=>Number.isFinite(value)?(value>=0?'+':'')+(value*100).toFixed(2)+'%':'--';const signed=(value)=>Number.isFinite(value)?(value>=0?'+':'')+price(value):'--';
    function saveState(extra={}){vscode.setState({...vscode.getState(),tab:document.querySelector('.top-tab.active')?.dataset.tab||'data-center',page:current,selected,...extra})}function switchTab(id){document.querySelectorAll('.top-tab').forEach((item)=>item.classList.toggle('active',item.dataset.tab===id));document.querySelectorAll('.tab-panel').forEach((item)=>item.classList.toggle('active',item.id===id));saveState()}
    function load(id){const page=pages[id];if(!page)return;current=id;document.querySelectorAll('.nav-item').forEach((item)=>item.classList.toggle('active',item.dataset.page===id));title.textContent=page.title;description.textContent=page.description;state.textContent='正在加载数据页面...';state.classList.remove('hidden');clearTimeout(timeout);frame.src=page.url;timeout=setTimeout(()=>{if(!state.classList.contains('hidden'))state.textContent='页面加载时间较长，请刷新或在外部打开。'},12000);saveState()}
    function entries(){return [...watchlist.funds.flatMap((group,groupIndex)=>group.items.map((item)=>({kind:'fund',group:group.name,groupIndex,item,key:'fund:'+groupIndex+':'+item.code}))),...watchlist.stocks.flatMap((group,groupIndex)=>group.items.map((item)=>({kind:'stock',group:group.name,groupIndex,item,key:'stock:'+groupIndex+':'+item.code})))]}function itemValues(entry){const item=entry.item;if(entry.kind==='stock')return{value:item.price,change:item.changeRatio};return{value:item.estimatedNav??item.nav,change:item.estimatedChangeRatio??item.navChangeRatio}}
    function renderWatchlist(){const all=entries();watchList.replaceChildren();for(const kind of ['fund','stock']){const groups=kind==='fund'?watchlist.funds:watchlist.stocks;for(let groupIndex=0;groupIndex<groups.length;groupIndex++){const group=groups[groupIndex];const heading=document.createElement('div');heading.className='watch-group-title';heading.textContent=(kind==='fund'?'基金 · ':'股票 · ')+group.name;watchList.append(heading);for(const item of group.items){const key=kind+':'+groupIndex+':'+item.code;const values=itemValues({kind,item});const button=document.createElement('button');button.type='button';button.className='watch-item'+(key===selected?' active':'');button.dataset.key=key;button.innerHTML='<span class="watch-name">'+esc(item.name||item.code)+'</span><span class="'+(values.change>=0?'rise':'fall')+'">'+esc(price(values.value))+'</span><span class="watch-code">'+esc(item.code)+'</span><span class="watch-change '+(values.change>=0?'rise':'fall')+'">'+esc(percent(values.change))+'</span>';watchList.append(button)}}}if(!all.length){watchList.innerHTML='<div class="empty-group">暂无股票或基金自选</div>';selected='';renderDetail();return}if(!all.some((entry)=>entry.key===selected))selected=all[0].key;watchList.querySelectorAll('.watch-item').forEach((item)=>item.classList.toggle('active',item.dataset.key===selected));renderDetail();saveState()}
    function metrics(values){return '<div class="metric-grid">'+values.map(([label,value,cls=''])=>'<div class="metric"><span>'+esc(label)+'</span><strong class="'+cls+'">'+esc(value)+'</strong></div>').join('')+'</div>'}
    function renderDetail(){const entry=entries().find((value)=>value.key===selected);if(!entry){watchDetail.innerHTML='<div class="detail-empty">暂无自选数据</div>';return}const item=entry.item;const values=itemValues(entry);const color=values.change>=0?'rise':'fall';let band,overview;if(entry.kind==='stock'){band='<div class="quote-band"><div><div class="quote-price '+color+'">'+esc(price(item.price))+'</div><div class="'+color+'">'+esc(signed(item.change))+'　'+esc(percent(item.changeRatio))+'</div></div><div class="quote-stats"><span class="stat">今开 <b>'+esc(price(item.open))+'</b></span><span class="stat">最高 <b class="rise">'+esc(price(item.high))+'</b></span><span class="stat">成交量 <b>'+esc(item.volume??'--')+'</b></span><span class="stat">昨收 <b>'+esc(price(item.previousClose))+'</b></span><span class="stat">最低 <b class="fall">'+esc(price(item.low))+'</b></span><span class="stat">成交额 <b>'+esc(item.turnover??'--')+'</b></span></div></div>';overview=metrics([['现价',price(item.price),color],['涨跌额',signed(item.change),color],['涨跌幅',percent(item.changeRatio),color],['最高/最低',price(item.high)+' / '+price(item.low)],['数据来源',item.source]]);}else{band='<div class="quote-band"><div><div class="quote-price '+color+'">'+esc(price(values.value))+'</div><div class="'+color+'">'+esc(percent(values.change))+'</div></div><div class="quote-stats"><span class="stat">单位净值 <b>'+esc(price(item.nav))+'</b></span><span class="stat">估算净值 <b>'+esc(price(item.estimatedNav))+'</b></span><span class="stat">累计净值 <b>'+esc(price(item.accumulatedNav))+'</b></span><span class="stat">净值日期 <b>'+esc(item.navDate)+'</b></span><span class="stat">估算时间 <b>'+esc(item.estimateTime)+'</b></span><span class="stat">数据来源 <b>'+esc(item.source)+'</b></span></div></div>';overview=metrics([['单位净值',price(item.nav)],['估算净值',price(item.estimatedNav),color],['估算涨跌',percent(item.estimatedChangeRatio),color],['累计净值',price(item.accumulatedNav)],['净值日期',item.navDate]]);}const tail=entry.kind==='stock'?'<div id="stock-extended" class="stock-extended"><div class="stock-detail-loading">正在加载股票详情...</div></div>':'<div class="detail-actions"><button class="command" data-action="details" type="button">查看完整详情</button></div>';watchDetail.innerHTML='<header class="detail-header"><div class="detail-title"><h1>'+esc(item.name||item.code)+'</h1><span>'+esc(item.code)+'</span></div>'+band+'</header><div class="detail-body"><section class="detail-section"><h2>行情概览</h2>'+overview+'</section><section class="detail-section"><h2>自选信息</h2>'+metrics([['所属分组',entry.group],['类型',entry.kind==='stock'?'股票':'基金'],['行情状态',item.status==='live'?'实时':'暂无数据'],['更新时间',new Date(watchlist.updatedAt).toLocaleString('zh-CN')],['代码',item.code]])+'</section>'+tail+'</div>';if(entry.kind==='stock')requestStockDetails(entry)}
    async function requestStockDetails(entry){const container=document.getElementById('stock-extended');if(!container||entry.key!==selected)return;const cached=stockDetails.get(entry.key);if(cached){container.innerHTML=cached;return}if(loadingDetails.has(entry.key))return;loadingDetails.add(entry.key);let token=hexinToken;if(/^(?:sh|sz|bj)\d{6}$/i.test(entry.item.code)&&!token&&canGenerateHexinToken){try{token=getHexinToken();hexinToken=token}catch{token=undefined}}if(entry.key!==selected){loadingDetails.delete(entry.key);return}vscode.postMessage({command:'loadWatchlistStockDetails',key:entry.key,code:entry.item.code,name:entry.item.name,token})}
    document.querySelectorAll('.top-tab').forEach((item)=>item.addEventListener('click',()=>switchTab(item.dataset.tab)));document.querySelectorAll('.nav-item').forEach((item)=>item.addEventListener('click',()=>load(item.dataset.page)));watchList.addEventListener('click',(event)=>{const item=event.target.closest('.watch-item');if(!item)return;selected=item.dataset.key;renderWatchlist()});watchDetail.addEventListener('click',(event)=>{if(!event.target.closest('[data-action="details"]'))return;const entry=entries().find((value)=>value.key===selected);if(entry)vscode.postMessage({command:'openWatchlistDetails',kind:entry.kind,code:entry.item.code,name:entry.item.name})});frame.addEventListener('load',()=>{clearTimeout(timeout);state.classList.add('hidden')});document.getElementById('reload').addEventListener('click',()=>load(current));document.getElementById('external').addEventListener('click',()=>vscode.postMessage({command:'openExternal',pageId:current}));document.getElementById('refresh-watchlist').addEventListener('click',()=>vscode.postMessage({command:'refreshWatchlist'}));window.addEventListener('message',(event)=>{if(event.data?.command==='watchlistData'){watchlist=event.data.data;renderWatchlist();return}if(event.data?.command==='watchlistStockDetails'){loadingDetails.delete(event.data.key);const container=event.data.key===selected?document.getElementById('stock-extended'):undefined;if(event.data.html){stockDetails.set(event.data.key,event.data.html);if(container)container.innerHTML=event.data.html}else if(container){container.textContent='股票详情加载失败：'+(event.data.error||'未知错误');container.className='stock-detail-loading'}}});const saved=vscode.getState()||{};selected=saved.selected||'';load(${explicitPage ? 'current' : 'saved.page||current'});renderWatchlist();switchTab(${explicitPage ? "'data-center'" : "saved.tab||'data-center'"});
  </script></body></html>`;
}
