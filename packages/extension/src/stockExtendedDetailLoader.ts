import { StockGateway, StockIwenCaiGateway, StockResearchGateway } from '@tickerdock/domain';
import { researchKeywordForStockCode } from './stockAnalysisModel';
import { buildStockExtendedDetail } from './stockExtendedDetailModel';

export async function loadStockExtendedDetail(
  stockGateway: StockGateway,
  researchGateway: StockResearchGateway,
  iwencaiGateway: StockIwenCaiGateway,
  code: string,
  name: string,
  hexinToken?: string
) {
  const supportsIwenCai = /^(?:sh|sz|bj)\d{6}$/i.test(code);
  const researchKeyword = researchKeywordForStockCode(code);
  const [quoteResult, klineResult, researchResult, iwencaiResult] = await Promise.allSettled([
    stockGateway.getQuotes([code]),
    stockGateway.getKlines(code, { period: 'day', count: 120, adjust: 'qfq' }),
    researchKeyword ? researchGateway.search(researchKeyword, 10) : Promise.resolve([]),
    supportsIwenCai && hexinToken ? iwencaiGateway.getInsights(code, name, hexinToken) : Promise.resolve(undefined),
  ]);
  if (quoteResult.status !== 'fulfilled' || !quoteResult.value[0]) {
    throw quoteResult.status === 'rejected' ? quoteResult.reason : new Error(`No quote returned for ${code}.`);
  }
  const unavailable: string[] = [];
  if (supportsIwenCai && !hexinToken) unavailable.push('The browser token for iWencai could not be generated.');
  if (iwencaiResult.status === 'rejected') unavailable.push('iWencai diagnosis, concepts, heat, and official levels were unavailable.');
  if (klineResult.status === 'rejected') unavailable.push('Technical K-lines were unavailable.');
  if (researchResult.status === 'rejected') unavailable.push('Jiuyangongshe research was unavailable.');
  return buildStockExtendedDetail(
    quoteResult.value[0],
    klineResult.status === 'fulfilled' ? klineResult.value : [],
    researchResult.status === 'fulfilled' ? researchResult.value : [],
    unavailable,
    iwencaiResult.status === 'fulfilled' ? iwencaiResult.value : undefined
  );
}
