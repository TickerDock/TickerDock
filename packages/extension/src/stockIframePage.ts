export type StockChartMode = 'standard' | 'chips';

export interface StockIframeTargets {
  standard: string;
  chips?: string;
}

export function buildStockIframeTargets(
  code: string,
  eastMoneyOrigin = 'https://quote.eastmoney.com'
): StockIframeTargets {
  const normalized = code.trim().toUpperCase();
  const sector = /^BK\d{4}$/.exec(normalized);
  if (sector) {
    return { standard: `${eastMoneyOrigin}/basic/full.html?mcid=90.${sector[0].toUpperCase()}&type=r` };
  }
  const future = /^(?:HF|NF_)([A-Z0-9]+)$/.exec(normalized);
  if (future) {
    return { standard: `https://finance.sina.com.cn/futures/quotes/${future[1]!.toUpperCase()}.shtml` };
  }

  const mainland = /^(SH|SZ)(\d{6})$/.exec(normalized);
  if (mainland) {
    const [, market, digits] = mainland;
    const marketId = market === 'SH' ? '1' : '0';
    const standard = `${eastMoneyOrigin}/basic/full.html?mcid=${marketId}.${digits}`;
    const supportsChips = (market === 'SH' && !digits!.startsWith('000'))
      || (market === 'SZ' && !digits!.startsWith('399'));
    return {
      standard,
      chips: supportsChips
        ? `${eastMoneyOrigin}/basic/h5chart-iframe.html?code=${digits}&market=${marketId}`
        : undefined,
    };
  }

  const hongKong = /^HK([A-Z0-9]{3,12})$/.exec(normalized);
  if (hongKong) {
    return { standard: `${eastMoneyOrigin}/basic/full.html?mcid=116.${hongKong[1]}` };
  }

  const us = /^(?:US|USR_|GB_)([A-Z0-9.^-]{1,20})$/.exec(normalized);
  if (us) {
    return { standard: `${eastMoneyOrigin}/basic/full.html?mcid=105.${encodeURIComponent(us[1]!.toUpperCase())}` };
  }

  throw new Error(`Unsupported stock trend code: ${code}`);
}
