import { useEffect, useState, type ReactElement } from "react";
import { DataPage, percent } from "../components/DataPage";
import { EChart } from "../components/EChart";
import { postMessage, PROTOCOL_VERSION, type MarketSentimentSection, type MarketSentimentSnapshot } from "../protocol";

export function MarketSentimentPage({
  initialSnapshot,
  initialLoadingSections = [],
  error,
}: {
  initialSnapshot?: Partial<MarketSentimentSnapshot>;
  initialLoadingSections?: MarketSentimentSection[];
  error?: string;
}): ReactElement {
  const [snapshot, setSnapshot] = useState<Partial<MarketSentimentSnapshot>>(initialSnapshot ?? {});
  const [loadingSections, setLoadingSections] = useState(initialLoadingSections);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<MarketSentimentSection, string>>>({});
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data as Record<string, unknown> | undefined;
      if (!message || message.version !== PROTOCOL_VERSION || message.type !== "marketSentimentSection") return;
      const payload = message.payload as Record<string, unknown> | undefined;
      const section = payload?.section;
      if (!isMarketSentimentSection(section)) return;
      if (payload?.value !== undefined) {
        setSnapshot((current) => ({ ...current, [section]: payload.value }));
      }
      if (typeof payload?.error === "string") {
        setSectionErrors((current) => ({ ...current, [section]: payload.error as string }));
      }
      setLoadingSections((current) => current.filter((item) => item !== section));
    };
    window.addEventListener("message", listener);
    postMessage("marketSentimentReady", {});
    return () => window.removeEventListener("message", listener);
  }, []);
  const loading = !snapshot.breadth && !error;
  const sectionState = (section: MarketSentimentSection, empty: string) => (
    <p className="empty">{loadingSections.includes(section) ? "正在加载数据..." : sectionErrors[section] ? `加载失败：${sectionErrors[section]}` : empty}</p>
  );
  const breadth = snapshot?.breadth;
  const total = breadth
    ? breadth.rising + breadth.falling + breadth.unchanged
    : 0;
  const distribution = breadth
    ? Object.entries({
        "涨停": breadth.distribution.limitUp,
        "涨幅 >5%": breadth.distribution.aboveFive,
        "1% ~ 5%": breadth.distribution.upOneToFive,
        "0% ~ 1%": breadth.distribution.upZeroToOne,
        "平盘": breadth.distribution.flat,
        "0% ~ -1%": breadth.distribution.downZeroToOne,
        "-1% ~ -5%": breadth.distribution.downOneToFive,
        "跌幅 >5%": breadth.distribution.belowFive,
        "跌停": breadth.distribution.limitDown,
      })
    : [];
  return (
    <DataPage title="牛熊风向标" loading={loading} error={error}>
      {breadth ? (
        <>
          <p className="meta">更新时间：{breadth.time}</p>
          <section className="sentiment-stats">
            {[
              ["全部", total, ""],
              ["上涨", breadth.rising, "up-text"],
              ["涨停", breadth.limitUp, "up-text"],
              ["下跌", breadth.falling, "down-text"],
              ["跌停", breadth.limitDown, "down-text"],
            ].map(([label, value, className]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <strong className={String(className)}>{value}</strong>
                {label === "涨停" && (
                  <small>自然涨停 {breadth.naturalLimitUp}</small>
                )}
              </div>
            ))}
          </section>
        </>
      ) : null}
      <section>
        <h2>涨跌分布</h2>
        {distribution.length ? (
          <EChart
            className="distribution-echart"
            label="A股涨跌分布图"
            option={{
              animation: false,
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
              grid: { left: 18, right: 18, top: 34, bottom: 48 },
              xAxis: {
                type: "category",
                data: distribution.map(([label]) => label),
                axisLabel: { interval: 0 },
              },
              yAxis: { type: "value", minInterval: 1, show: false },
              series: [
                {
                  name: "股票",
                  type: "bar",
                  barMaxWidth: 52,
                  label: { show: true, position: "top" },
                  data: distribution.map(([, value], index) => ({
                    value,
                    itemStyle: {
                      color:
                        index < 4
                          ? "$chart-rise"
                          : index > 4
                            ? "$chart-fall"
                            : "$chart-flat",
                    },
                  })),
                },
              ],
            }}
          />
        ) : (
          <p className="empty">暂无涨跌分布数据。</p>
        )}
      </section>
      <section>
        <h2>热门题材</h2>
        {snapshot.hotThemes?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>题材</th>
                  <th>涨跌幅</th>
                  <th>领涨股</th>
                  <th>涨跌幅</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.hotThemes.map((item) => (
                  <tr key={item.code}>
                    <td>{item.name}</td>
                    <td
                      className={
                        item.changeRatio >= 0 ? "up-text" : "down-text"
                      }
                    >
                      {percent(item.changeRatio)}
                    </td>
                    <td>
                      {item.leadingStockName}{" "}
                      <small>{item.leadingStockCode}</small>
                    </td>
                    <td
                      className={
                        item.leadingStockChangeRatio >= 0
                          ? "up-text"
                          : "down-text"
                      }
                    >
                      {percent(item.leadingStockChangeRatio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          sectionState("hotThemes", "暂无热门题材数据。")
        )}
      </section>
      <section>
        <h2>大盘资金流</h2>
        {snapshot.marketFundFlow?.length ? (
          <FlowChart points={snapshot.marketFundFlow} />
        ) : (
          sectionState("marketFundFlow", "暂无有效的大盘资金流数据。")
        )}
      </section>
      <section>
        <h2>个股资金流排名</h2>
        {snapshot.stockFundFlowRank?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>股票</th><th>最新价</th><th>涨跌幅</th><th>主力净流入</th><th>净占比</th></tr></thead>
              <tbody>{snapshot.stockFundFlowRank.map((item) => (
                <tr key={item.code}>
                  <td>{item.name} <small>{item.code}</small></td>
                  <td>{item.price?.toFixed(2) ?? "--"}</td>
                  <td className={ratioClass(item.changeRatio)}>{formatRatio(item.changeRatio)}</td>
                  <td className={ratioClass(item.mainNetInflowYi)}>{formatYi(item.mainNetInflowYi)}</td>
                  <td className={ratioClass(item.mainNetInflowRatio)}>{formatRatio(item.mainNetInflowRatio)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : sectionState("stockFundFlowRank", "暂无个股资金流排名数据。")}
      </section>
      <section>
        <h2>板块资金流排名</h2>
        {snapshot.sectorFundFlowRank?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>板块</th><th>涨跌幅</th><th>主力净流入</th><th>净占比</th><th>领涨股</th></tr></thead>
              <tbody>{snapshot.sectorFundFlowRank.map((item) => (
                <tr key={item.code}>
                  <td>{item.name} <small>{item.code}</small></td>
                  <td className={ratioClass(item.changeRatio)}>{formatRatio(item.changeRatio)}</td>
                  <td className={ratioClass(item.mainNetInflowYi)}>{formatYi(item.mainNetInflowYi)}</td>
                  <td className={ratioClass(item.mainNetInflowRatio)}>{formatRatio(item.mainNetInflowRatio)}</td>
                  <td>{item.topStockName ?? "--"} {item.topStockCode ? <small>{item.topStockCode}</small> : null}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : sectionState("sectorFundFlowRank", "暂无板块资金流排名数据。")}
      </section>
    </DataPage>
  );
}

function FlowChart({
  points,
}: {
  points: MarketSentimentSnapshot["marketFundFlow"];
}): ReactElement {
  return (
    <EChart
      label="大盘资金流折线图"
      option={{
        animation: false,
        tooltip: { trigger: "axis" },
        legend: { type: "scroll", data: ["主力", "超大单", "大单", "中单", "小单"], top: 4 },
        grid: { left: 62, right: 24, top: 48, bottom: 58 },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: points.map(({ date }) => date),
          axisLabel: { hideOverlap: true },
        },
        yAxis: { type: "value", scale: true },
        dataZoom: [{ type: "inside" }],
        series: [
          {
            name: "主力",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.mainNetInflowYi),
          },
          {
            name: "超大单",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.superLargeNetInflowYi),
          },
          {
            name: "大单",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.largeNetInflowYi),
          },
          {
            name: "中单",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.mediumNetInflowYi),
          },
          {
            name: "小单",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.smallNetInflowYi),
          },
        ],
      }}
    />
  );
}

function formatYi(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}亿`;
}

function formatRatio(value?: number): string {
  return value === undefined ? "--" : percent(value);
}

function ratioClass(value?: number): string {
  return value === undefined ? "" : value >= 0 ? "up-text" : "down-text";
}

function isMarketSentimentSection(value: unknown): value is MarketSentimentSection {
  return value === "breadth" || value === "hotThemes" || value === "marketFundFlow"
    || value === "stockFundFlowRank" || value === "sectorFundFlowRank";
}
