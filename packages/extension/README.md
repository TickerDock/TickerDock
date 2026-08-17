# TickerDock

TickerDock 是一款面向中文用户的 VS Code 行情侧边栏扩展。无需离开编辑器，即可查看股票、基金、期货、外汇和 Binance 行情，并管理自选分组、持仓收益、价格提醒、状态栏行情与 AI 研究。

> 行情、分析结果和参考价位仅供信息展示，不构成投资建议。交易决策及其风险由用户自行承担。

## 主要功能

- 查看 A 股、港股、美股、国内期货和国际期货行情。
- 查看基金净值、盘中估值、历史净值、基金排行、持仓和资金流向。
- 查看 Binance 现货行情和 TradingView 详情页。
- 查看中国银行外汇牌价，并将港币、美元持仓折算为人民币。
- 创建股票与基金自选分组，支持搜索、排序、置顶和调整顺序。
- 管理股票与基金持仓，展示持仓市值、累计收益和当日收益。
- 在 VS Code 底部状态栏展示持仓收益和最多 8 只自选股票行情。
- 设置股票价格或涨跌幅向上、向下穿越提醒。
- 查看股票 K 线、基金走势、基金对比和基金趋势总览。
- 查看市场涨跌分布、热门主题、资金流向和牛熊风向标。
- 查看股票均线、支撑压力、止盈止损参考、研报和问财诊断。
- 使用兼容 OpenAI Responses API 与 Chat Completions 的 AI 研究功能。
- 在按需开启的控制台中查看金十和选股宝快讯。

## 安装要求

- VS Code `1.85.0` 或更高版本。
- 行情和分析功能需要可用的网络连接。
- AI 功能需要用户自行配置兼容的 API 地址、模型和 API Key。

可在 VS Code 扩展市场搜索 `TickerDock` 安装，也可以通过“扩展：从 VSIX 安装”安装已下载的扩展包。

扩展标识：`tickerdock.tickerdock`

## 快速开始

安装后，活动栏会出现 TickerDock 图标，底部状态栏也会随扩展启动。

1. 打开 TickerDock 侧边栏。
2. 在 `Stock` 或 `Fund` 视图标题栏中创建分组。
3. 通过分组右侧的添加按钮搜索并加入股票或基金。
4. 右键单个项目，可查看详情、走势、AI 分析，或设置持仓与提醒。
5. 打开 VS Code 设置并搜索 `TickerDock`，可调整刷新间隔、交易时段、状态栏和快讯选项。

旧版 `leek-fund.*` 自选和配置会在可兼容的范围内继续读取，并可通过设置导入功能迁移。

## 自选与持仓

### 自选分组

`Stock` 和 `Fund` 视图支持创建、重命名和删除分组。分组内项目可以置顶、上移、下移或删除。旧版扁平股票和基金列表会迁移到默认分组。

### 持仓收益

股票和基金工具栏均提供批量持仓管理。持仓数据保存在 VS Code 配置中，市值和收益在本地计算。

港股和美股持仓使用中国银行现汇卖出价折算为人民币。汇率不可用时，对应币种不会计入人民币合计，并会显示提示，避免使用错误汇率估算。

## 状态栏

状态栏会随插件启动创建，无需先打开 TickerDock 侧边栏。可以分别控制：

- 股票持仓收益；
- 基金持仓收益；
- 自选股票行情；
- 涨跌图标和自定义颜色。

点击状态栏股票可直接打开走势图。状态栏行情最多支持 8 只股票，以限制后台请求量和界面占用。

## 快讯控制台

快讯不占用独立侧边栏。点击 `Stock` 视图标题栏中的输出图标，可打开快讯控制台。

- 控制台打开后才开始轮询；
- 控制台关闭后立即停止后续轮询；
- 关闭后，尚未完成的请求结果不会再写入页面；
- 页面最多保留最近 300 条记录，避免长时间打开造成内存持续增长；
- 可分别启用金十或选股宝数据源。

## 股票提醒

右键股票并选择提醒命令，可以设置价格或涨跌幅向上、向下穿越提醒。提醒快照和冷却状态保存在 VS Code 全局状态中，扩展只跟踪实际配置了规则的股票。

使用命令 `TickerDock: Toggle Stock Reminders` 可以暂停或恢复提醒，而无需删除已有规则。

## AI 研究

通过命令面板使用以下命令：

- `TickerDock: Configure AI`
- `TickerDock: Ask AI`
- `TickerDock: Analyze Stock with AI`
- `TickerDock: Configure AI Stock History Range`
- `TickerDock: Delete AI API Key`

支持 `1w`、`1m`、`3m`、`6m` 和 `1y` 股票历史范围。API Key 只保存在 VS Code SecretStorage 中，不会写入普通设置或导出文件。AI 输出通道在首次使用时才创建。

## 常用配置

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `tickerdock.interval` | 股票和基金前台刷新间隔，单位为毫秒 | `15000` |
| `tickerdock.marketStatusBarInterval` | 底部行情股票刷新间隔，单位为毫秒 | `15000` |
| `tickerdock.portfolioStatusBarInterval` | 底部股票和基金持仓刷新间隔，单位为毫秒 | `15000` |
| `tickerdock.marketHoursEnabled` | 仅在对应市场交易时段自动刷新 | `true` |
| `tickerdock.binanceInterval` | Binance 刷新间隔，单位为毫秒 | `10000` |
| `tickerdock.forexInterval` | 外汇刷新间隔，单位为毫秒 | `3600000` |
| `tickerdock.newsInterval` | 快讯控制台刷新间隔，单位为毫秒 | `15000` |
| `tickerdock.newsSources` | 启用的快讯来源 | `jin10`、`xuangubao` |
| `tickerdock.remindersEnabled` | 启用股票提醒 | `true` |
| `tickerdock.showMarketStatusBar` | 显示自选行情状态栏 | `true` |
| `tickerdock.showStockPortfolioStatusBar` | 显示股票收益状态栏 | `true` |
| `tickerdock.showFundPortfolioStatusBar` | 显示基金收益状态栏 | `true` |

更多配置可在 VS Code 设置中搜索 `TickerDock` 查看。

## 性能策略

TickerDock 随 VS Code 启动，以便及时创建底部状态栏，但后台任务会根据实际需求调度：

- 底部行情与持仓使用独立刷新间隔，默认每 15 秒刷新，最低可设为 3 秒；
- 股票视图隐藏后，提醒轮询最低间隔为 60 秒；基金视图隐藏后停止侧边栏刷新；
- 隐藏状态下只估值持仓基金，并限制估值请求并发数；
- Binance 仅在对应视图可见时轮询；
- 外汇仅在视图可见或外币持仓需要换算时刷新；
- 非交易时段暂停自动股票和基金请求；
- 快讯控制台、AI 输出和复杂页面均按需创建；
- 韭菜中心隐藏后释放 React 页面和外部 iframe。

如果不希望按交易时段限制刷新，可运行 `TickerDock: Toggle Market-Hours Scheduling`。

## 设置导入与导出

- `TickerDock: Export Settings` 导出带版本号的 JSON 配置备份。
- `TickerDock: Import Settings` 导入当前配置或旧版 `leek-fund.*` 扁平配置。
- 导入前会校验支持的字段，并创建可用于回滚的备份。
- Cookie、API Key 等密钥不会包含在普通配置备份中。

## 数据与安全

- AI API Key 和需要认证的数据源 Cookie 仅保存在 VS Code SecretStorage。
- Webview 使用固定页面类型、内容安全策略和受限数据来源。
- 股票与基金图表在本地渲染，不从 CDN 加载运行脚本。
- 本地行情代理只监听回环地址，并限制可访问的远端目标。
- 日志不会记录 API Key、认证请求头或完整 AI 原始输入。

行情数据来自第三方公开接口，接口可用性、实时性和准确性可能因网络、市场状态或数据源策略变化而受到影响。

## 问题反馈

遇到问题时，请在 [GitHub Issues](https://github.com/TickerDock/TickerDock/issues) 提交反馈，并尽量包含：

- VS Code 与 TickerDock 版本；
- 操作系统；
- 可复现步骤；
- TickerDock 输出通道中的相关错误信息，请先移除账号、Cookie 和 API Key 等敏感内容。

项目源码与更新记录：[TickerDock GitHub 仓库](https://github.com/TickerDock/TickerDock)

## 许可证

TickerDock 使用 [MIT License](https://github.com/TickerDock/TickerDock/blob/main/LICENSE)。
