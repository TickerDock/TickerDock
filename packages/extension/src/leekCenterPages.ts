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
  { id: 'bull-bear', title: '选股通盯盘', description: '', group: 'Market', url: 'https://xuangutong.com.cn/dingpan' },
  { id: 'wind-vane', title: '股票风向标', description: '题材、行业与市场情绪概览', group: 'Market', url: 'https://quote.eastmoney.com/zhuti/#ggfxb' },
  { id: 'northbound-flow', title: '沪深港通资金流', description: '沪股通、深股通和港股通资金流向', group: 'Market', url: 'https://emrnweb.eastmoney.com/hsgt/home' },
  { id: 'main-capital-flow', title: '主力资金流', description: '全市场主力资金流入流出', group: 'Market', url: 'https://emdatah5.eastmoney.com/dc/zjlx/index' },
  { id: 'capital-dashboard', title: '资金流看板', description: '交互式板块资金流看板', group: 'Market', url: 'https://view.le5le.com/v/?id=019749ca-8bc5-786f-aa04-913e3c62bea8' },
  { id: 'dragon-tiger', title: '龙虎榜', description: '每日异动席位与交易明细', group: 'Trading', url: 'https://datapc.eastmoney.com/emdatacenter/Ranking/Index?color=b' },
  { id: 'block-trades', title: '大宗交易', description: '大额协议股票交易', group: 'Trading', url: 'https://datapc.eastmoney.com/emdatacenter/dzjy/index?color=b' },
  { id: 'margin', title: '融资融券', description: '融资买入与融券卖出数据', group: 'Trading', url: 'https://datapc.eastmoney.com/emdatacenter/rzrq/index?market=sh&color=b' },
  { id: 'executive-holdings', title: '高管持股', description: '高管及重要股东持股变动', group: 'Trading', url: 'https://datapc.eastmoney.com/emdatacenter/ggcg/index?color=b' },
  { id: 'ipo-subscription', title: '新股申购', description: '即将发行股票的申购信息', group: 'Issuance', url: 'https://datapc.eastmoney.com/da/Purchase/Index?color=b' },
  { id: 'ipo-calendar', title: '新股日历', description: '上市与申购日期安排', group: 'Issuance', url: 'https://datapc.eastmoney.com/da/calendar/index?color=b' },
  { id: 'additional-issuance', title: '增发', description: '定向及公开增发信息', group: 'Issuance', url: 'https://datapc.eastmoney.com/da/Issuance/Index?color=b' },
  { id: 'rights-issues', title: '配股', description: '上市公司配股记录', group: 'Issuance', url: 'https://datapc.eastmoney.com/da/AllottedShares/Index?color=b' },
  { id: 'research', title: '研报中心', description: '券商研报报告与评级', group: 'Research', url: 'https://eminfo.eastmoney.com/pc_news/research/index?color=b' },
  { id: 'macro-economy', title: '宏观经济', description: '国内宏观经济指标', group: 'Research', url: 'https://datapc.eastmoney.com/emdatacenter/economy/Index?color=b' },
];

export function getLeekCenterPage(id: string): LeekCenterPage | undefined {
  return LEEK_CENTER_PAGES.find((page) => page.id === id);
}
