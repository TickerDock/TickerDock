import type { ReactElement } from "react";
import { DataPage, percent } from "../components/DataPage";
import { EChart } from "../components/EChart";
import type { MarketSentimentSnapshot } from "../protocol";

export function MarketSentimentPage({
  snapshot,
  error,
}: {
  snapshot?: MarketSentimentSnapshot;
  error?: string;
}): ReactElement {
  const loading = !snapshot && !error;
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
        {snapshot?.hotThemes.length ? (
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
          <p className="empty">暂无热门题材数据。</p>
        )}
      </section>
      <section>
        <h2>沪深港通净流入</h2>
        {snapshot?.stockConnectFlow.length ? (
          <FlowChart points={snapshot.stockConnectFlow} />
        ) : (
          <p className="empty">暂无有效的沪深港通资金流数据。</p>
        )}
      </section>
    </DataPage>
  );
}

function FlowChart({
  points,
}: {
  points: MarketSentimentSnapshot["stockConnectFlow"];
}): ReactElement {
  return (
    <EChart
      label="沪深港通净流入折线图"
      option={{
        animation: false,
        tooltip: { trigger: "axis" },
        legend: { data: ["沪股通", "深股通", "北向资金"], top: 4 },
        grid: { left: 62, right: 24, top: 48, bottom: 58 },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: points.map(({ time }) => time),
          axisLabel: { hideOverlap: true },
        },
        yAxis: { type: "value", scale: true },
        dataZoom: [{ type: "inside" }],
        series: [
          {
            name: "沪股通",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.shanghaiNetInflowYi),
          },
          {
            name: "深股通",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.shenzhenNetInflowYi),
          },
          {
            name: "北向资金",
            type: "line",
            showSymbol: false,
            data: points.map((point) => point.northboundNetInflowYi),
          },
        ],
      }}
    />
  );
}
