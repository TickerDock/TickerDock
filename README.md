# TickerDock

TickerDock 是面向中文用户的 VS Code 行情侧边栏，支持股票、基金、期货、外汇和 Binance 行情，并提供自选分组、持仓收益、状态栏行情、提醒和本地数据分析工具。

> 行情、分析结果和参考价位仅供信息展示，不构成投资建议。

## 主要功能

- A 股、港股、美股、国内期货和国际期货行情。
- 基金净值、盘中估值、历史净值、基金排行、持仓和资金流向。
- Binance 现货行情与 TradingView 详情页。
- 中国银行外汇牌价，以及港币、美元持仓的人民币汇总。
- 股票和基金自选分组、排序、置顶及批量持仓管理。
- 股票、基金持仓市值、累计收益和当日收益状态栏。
- 最多 8 个自选股票行情状态栏，点击可打开走势页面。
- 股票价格和涨跌幅阈值提醒。
- 股票 K 线、基金走势、基金对比和基金趋势总览。
- 牛熊风向标，包括市场涨跌分布、热门主题和资金流向。
- 股票扩展详情，包括均线、支撑压力、止盈止损参考、研报和问财诊断。
- 韭菜中心，用于访问固定、受限的数据页面和自选详情。
- OpenAI Responses API 与 Chat Completions 兼容的 AI 研究功能。
- 金十和选股宝快讯控制台。

## 快速开始

### 安装 VSIX

构建扩展包：

```bash
pnpm install
pnpm package:vsix
```

随后在 VS Code 中执行“扩展：从 VSIX 安装”，选择项目根目录生成的 `tickerdock.vsix`。

### 开发调试

使用 VS Code 打开项目，在“运行和调试”中执行 `Run TickerDock Extension`，即可启动扩展开发宿主。

常用命令：

```bash
pnpm install
pnpm bump-version
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
pnpm test:integration
pnpm package:vsix
```

`pnpm release:check` 会依次执行检查、集成测试和 VSIX 打包。

发布前可运行 `pnpm bump-version` 同时更新根清单和扩展清单，默认递增 patch 版本。也可以传入 `minor`、`major` 或指定版本（例如 `pnpm bump-version 0.2.0`）；添加 `--dry-run` 可只预览结果。

## 使用说明

### 自选与分组

Stock 和 Fund 视图支持创建、重命名和删除分组。可以在分组中搜索并添加标的，也可以通过右键菜单置顶、上移、下移或删除。

旧版扁平 `stocks`、`funds` 配置会迁移到默认分组，并继续保持兼容。

### 持仓与状态栏

股票和基金工具栏均提供批量持仓管理器。持仓数据保存在 VS Code 配置中，收益计算在扩展宿主本地完成。

底部状态栏随插件启动，并可独立控制：

- 股票持仓收益；
- 基金持仓收益；
- 自选股票行情；
- 涨跌方向图标和自定义颜色。

港股和美股持仓使用中国银行现汇卖出价换算为人民币。汇率不可用时，对应币种不会计入人民币合计，并会显示明确提示。

### 快讯控制台

Flash News 不占用独立侧边栏。点击 Stock 视图标题栏中的“显示快讯输出”可打开快讯控制台。

- 控制台打开后才开始轮询；
- 控制台关闭后立即停止后续轮询；
- 正在返回的请求在控制台关闭后会被丢弃；
- 页面最多保留最近 300 条记录，避免长时间打开造成内存持续增长；
- 可通过 `tickerdock.newsSources` 分别启用金十或选股宝。

### 股票提醒

可以为股票设置价格或涨跌幅向上、向下穿越提醒。提醒快照和冷却时间保存在 VS Code 全局状态中，仅跟踪真正配置了规则的股票。

使用 `TickerDock: Toggle Stock Reminders` 可以暂停或恢复提醒，而不删除已有规则。

### AI 研究

使用以下命令配置和调用 AI：

- `TickerDock: Configure AI`
- `TickerDock: Ask AI`
- `TickerDock: Analyze Stock with AI`
- `TickerDock: Configure AI Stock History Range`

API Key 仅保存在 VS Code SecretStorage 中。支持 `1w`、`1m`、`3m`、`6m` 和 `1y` 股票历史范围。AI 输出通道在首次使用时才创建，不会随扩展启动占用额外资源。

## 性能策略

TickerDock 会随 VS Code 启动，以便及时创建底部状态栏，但后台任务会根据实际需求调度：

- 前台行情默认每 15 秒刷新；
- 底部行情与持仓使用独立刷新间隔，默认每 15 秒刷新，最低可设为 3 秒；
- 股票视图隐藏后，提醒轮询最低间隔为 60 秒，且只请求提醒依赖的股票；
- 基金视图隐藏且没有基金持仓时停止基金刷新；
- 隐藏基金视图只估值持仓基金，估值请求最大并发数为 4；
- Binance 仅在对应视图可见时轮询；
- 外汇仅在视图可见或外币持仓需要换算时刷新；
- 非交易时段暂停自动股票和基金请求；
- 韭菜中心隐藏后释放 React 页面和外部 iframe，仅保留轻量恢复状态。

可使用 `TickerDock: Toggle Market-Hours Scheduling` 切换交易时段限制。

## 常用配置

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `tickerdock.interval` | 股票、基金前台刷新间隔（毫秒） | `15000` |
| `tickerdock.marketStatusBarInterval` | 底部行情股票刷新间隔（毫秒） | `15000` |
| `tickerdock.portfolioStatusBarInterval` | 底部股票、基金持仓刷新间隔（毫秒） | `15000` |
| `tickerdock.marketHoursEnabled` | 仅在对应市场交易时段自动刷新 | `true` |
| `tickerdock.binanceInterval` | Binance 刷新间隔 | `10000` |
| `tickerdock.forexInterval` | 外汇刷新间隔 | `3600000` |
| `tickerdock.newsInterval` | 快讯控制台刷新间隔 | `15000` |
| `tickerdock.newsSources` | 启用的快讯来源 | `jin10`、`xuangubao` |
| `tickerdock.remindersEnabled` | 启用股票提醒 | `true` |
| `tickerdock.showMarketStatusBar` | 显示行情状态栏 | `true` |
| `tickerdock.showStockPortfolioStatusBar` | 显示股票收益状态栏 | `true` |
| `tickerdock.showFundPortfolioStatusBar` | 显示基金收益状态栏 | `true` |

扩展使用 `tickerdock.*` 配置，并在用户尚未显式设置新值时兼容读取 `leek-fund.*` 配置。

## 设置导入导出

- `TickerDock: Export Settings` 导出带版本号的 JSON 配置备份。
- `TickerDock: Import Settings` 可导入当前配置或旧版 `leek-fund.*` 扁平配置。
- 导入前会校验支持的字段并创建回滚备份。
- Cookie、API Key 等密钥不会包含在普通设置备份中。

## 数据与安全

- API Key 和雪球 Cookie 只写入 VS Code SecretStorage。
- Webview 使用固定页面类型、严格 CSP 和受限来源。
- 股票、基金图表在本地渲染，不从 CDN 加载运行脚本。
- 东方财富代理仅监听回环地址，并只允许固定目标，不接受任意转发 URL。
- 浏览器生成的问财 `hexin-v` 只用于当前固定请求流程。
- 日志不会记录 API Key、认证请求头或完整 AI 原始输入。

## 项目结构

```text
packages/domain        与数据源无关的领域模型和网关接口
packages/data-sources  stock-api、fund-api、stock-sdk 等数据适配器
packages/extension     VS Code 激活、命令、调度、状态栏和 TreeView
packages/webview-ui    本地 React Webview 页面与图表
docs                   迁移和设计文档
```

迁移范围和后续工作参见 [docs/MIGRATION.md](docs/MIGRATION.md)。

## 兼容性

- VS Code `1.85.0` 及以上版本。
- 旧版行情代码只在数据源边界转换，用户无需重新创建自选列表。
- 旧版刷新、排序、设置、AI 和状态栏命令 ID 会转发到当前实现，现有快捷键可以继续使用。

## 许可证

本项目使用 [MIT License](LICENSE)。
