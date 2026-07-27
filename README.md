# TickerDock

面向中文用户的 VS Code 行情侧边栏，支持股票、基金、期货、外汇和 Binance 行情及持仓管理。

## Workspace

- `packages/domain`: source-independent market models and gateway contracts.
- `packages/data-sources`: adapters for `stock-api` and `fund-api`.
- `packages/extension`: VS Code activation, commands, refresh scheduling, and TreeViews.

The current beta supports A/HK/US stocks, domestic and overseas futures, fund
NAV plus intraday estimates, grouped watchlists, portfolio P/L, status bars,
and threshold reminders.

Stock and fund view toolbars include batch position managers. They edit all
watched positions plus stale configured positions in one local Webview, validate
every saved row in the extension host, and replace the corresponding position
configuration atomically before refreshing portfolio results.

Held stocks use VS Code's native label highlighting and an explicit `Holding`
marker without custom colors. Toggle this with `TickerDock: Toggle Held-Stock
Highlight`; the setting falls back to legacy `stockHeldTipShow` values.

The Stock view supports the same custom-group workflow as funds: create,
rename, and remove groups, then add or reorder stocks inside the selected
group. Legacy flat `stocks` settings migrate into a `My Stocks` group and stay
synchronized for backward compatibility.

Adding a stock, fund, or Binance pair uses one live-search picker. Results are
updated while typing with debounced requests and stale-result protection.

The extension also includes configurable Binance and Bank of China forex
TreeViews, display sorting, persistent watchlist reordering, stock K-line
charts, and fund NAV history charts.

Native host-side integrations now also provide a combined Jin10 and XuanGuBao
flash-news feed, fund top holdings, a daily fund return ranking, and
industry/concept/region net inflow views without loading remote scripts or
third-party pages inside Webviews.

Fund context menus also open a reusable extended-detail view backed by
structured EastMoney requests. It combines fund metadata, period returns,
profit probabilities, diagnostic scores, institution ratings, similar-fund
performance, and top holdings; individual source failures do not discard the
remaining sections.

Leek Center provides a single responsive navigation surface for the remaining
EastMoney data pages and the capital-flow dashboard. Embedded origins are
declared in a strict CSP allowlist. Stock Wind Vane uses a loopback-only,
fixed-target EastMoney proxy so it can run inside a VS Code Webview without
exposing a general-purpose forwarding endpoint.

The Stock view also includes a native Bull/Bear Market Compass. The extension
host fetches and normalizes A-share breadth, nine price-distribution buckets,
hot themes, and Stock Connect net-inflow points; a script-disabled Webview
renders the dashboard locally. Placeholder and all-zero Stock Connect rows are
reported as unavailable rather than presented as real flow data.

Opt-in Xueqiu timelines are available in a dedicated TreeView. The authenticated
Cookie is stored only in VS Code SecretStorage, and timeline HTML is reduced to
static text before it reaches a Webview.

AI research commands support the OpenAI Responses API and Chat Completions
compatible gateways. API keys are stored only in SecretStorage. Use `TickerDock:
Configure AI`, `TickerDock: Ask AI`, or the `Analyze Stock with AI` stock context
command; stock analysis combines normalized K-lines with a bounded snapshot of
the currently enabled flash-news sources. AI output is rendered in a
script-disabled Webview.

AI stock analysis supports persisted `1w`, `1m`, `3m`, `6m`, and `1y` daily
K-line ranges. Use `TickerDock: Configure AI Stock History Range`; compatible
legacy `aiStockHistoryRange` values are read automatically.

Stock context menus can open a local, script-disabled Jiuyangongshe research
view. The same bounded stock-specific excerpts can enrich AI analysis, while
research-provider failures remain isolated from K-lines and flash news.

The Settings sidebar keeps direct entries for Leek Center, AI assistant
configuration, and extension personalization settings.

Personalization opens a dedicated local editor for standard or template-based
stock and fund labels, market status-bar templates, change icon style, optional
rise/fall colors, K-line defaults, held-position highlighting, reminders,
market-hours refresh, and status-bar visibility. Templates accept only bounded,
allowlisted placeholders and legacy `padLeft`/`padRight` operations. Legacy
`labelFormat`, `iconType`, `riseColor`, and `fallColor` settings are mapped
without injecting CSS into the VS Code workbench.
The original `arrow`, `arrow1`, `food1`, `food2`, `food3`, `iconfood`, and `none`
icon choices retain their original SVG or Emoji mappings, including the 2%
single/double-arrow threshold.

Successful general and stock AI responses are also appended to the `TickerDock
AI Research` Output Channel with timestamps and bounded titles. Use `TickerDock:
Show AI Research Output` or `TickerDock: Clear AI Research Output`. API keys,
request headers, and raw stock-analysis inputs are never written there.

## Commands

```bash
pnpm install
pnpm check
pnpm test:integration
pnpm package:vsix
```

`pnpm test:integration` launches the extension in the VS Code 1.85.2 baseline
host and verifies activation, contributed-command registration, and a live
configuration reload. `pnpm package:vsix` writes the Marketplace package to
`tickerdock.vsix`; `pnpm release:check` runs unit checks, integration tests, and
packaging together.

Pushing a version tag such as `v0.1.0` runs the release workflow, verifies that
the tag matches the extension version, publishes `tickerdock.vsix` to the VS
Code Marketplace, and creates a GitHub Release. The repository must define a
`VSCE_PAT` Actions secret with Marketplace publish permission.
Version `0.1.0` is published as a Marketplace pre-release and a GitHub
pre-release; remove the corresponding flags from the release workflow when the
extension is ready for its first stable release.

The extension uses `tickerdock.*` settings and falls back to existing
`leek-fund.*` values until a new value is explicitly configured. Legacy codes
are translated only at the data-source boundary, so users do not need to
recreate their watchlists.

Open this directory in VS Code and run `Run TickerDock Extension` from the
Run and Debug view to launch an Extension Development Host. See
`docs/MIGRATION.md` for the completed scope and the next migration slices.

Xueqiu requires a Cookie copied from an authenticated browser session. Configure
it with `Configure Xueqiu Cookie`; it is never copied automatically from a
browser or written to normal VS Code settings.

`TickerDock: Export Settings` writes a versioned JSON backup containing only
supported non-secret settings. `TickerDock: Import Settings` also accepts legacy
flat `leek-fund.*` exports, validates every supported value, excludes legacy
Cookie/API-key fields, and creates a rollback backup before changing settings.

The status bar can show portfolio profit summaries and up to four selected
market quotes. Configure quote items from the Stock view title or stock context
menu. Visibility and direction icons can be toggled independently from the
command palette; clicking a quote opens its stock trend page.

Stock trend pages route fixed EastMoney destinations through the same
loopback-only service so Shanghai and Shenzhen individual stocks can switch
between the standard chart and chip distribution without an embedded-page
verification prompt. Index, Hong Kong, and US codes use the fixed standard
page, while futures use a fixed Sina quote page. The host constructs every
destination from validated internal codes; arbitrary targets are not accepted.
The legacy numeric `stockKLineChartSwitch` value maps to the persisted
`tickerdock.stockChartMode` setting.

Fund NAV ranges from one month through all history remain locally rendered.
Clicking a Binance pair opens the original embedded TradingView spot chart for
the fixed `BINANCE:<pair>` symbol. The host validates the pair and constructs the
iframe destination using TradingView's current hash-based widget options;
arbitrary URLs are never accepted.
Stock, fund, and Binance default detail clicks each reuse one type-specific
editor tab. Selecting another item updates and reveals that tab instead of
opening an additional editor.

Stock extended details are available from a stock item context menu or the
`TickerDock: View Extended Stock Details` command. The page combines the live
quote, 20-day and 60-day averages, recent support and resistance, derived
take-profit and stop-loss reference levels, and related Jiuyangongshe research.
The levels are calculated from local K-lines and are not investment advice.
For A-share stocks, the page also restores the legacy iWencai browser-token
flow and displays the official diagnosis, score, short/mid/long views,
concepts, community heat, support/resistance and take-profit/stop-loss fields,
and institution reports when returned by the provider. The browser generates
only the short-lived `hexin-v` token; the extension host accepts no remote URL
or arbitrary request options from the Webview.

Portfolio summaries normalize Hong Kong dollar and US dollar positions to CNY
using Bank of China spot selling rates, which are quoted per 100 foreign-currency
units. Individual TreeView positions remain in their native currency. A missing
rate excludes that currency from the CNY total and produces an explicit warning.
Stock and fund portfolio summaries have independent status-bar visibility
commands, while the combined portfolio command still toggles both together.
Visible portfolio status items remain available as clickable placeholders when
no positions are configured, opening the corresponding position manager. The
legacy `showEarnings` setting controls portfolio visibility; the unrelated
`hideFundBarItem` market-quote icon setting is no longer mapped to it.
When the legacy extension is not installed, compatible legacy command IDs for
refresh, sorting, settings, AI, and status-bar actions forward to the new
implementation so existing keyboard shortcuts continue to work.

Reminder quote snapshots and cooldown timestamps are persisted in VS Code global
state. Writes are coalesced during normal refreshes and committed immediately
when a reminder fires, preventing duplicate threshold notifications after a
restart. Invalid or older-than-seven-day state is discarded.
Use `TickerDock: Toggle Stock Reminders` to suspend or resume notifications
without removing configured thresholds.

Automatic stock and fund refreshes are market-session aware. A-share, Hong Kong,
US, domestic-futures, and global-futures codes are filtered independently using
their local IANA time zones; US daylight saving time is handled automatically.
Known 2026 exchange holidays are included, with weekday/session fallback for
other years. Initial, manual, and configuration-triggered refreshes always run.
Use `TickerDock: Toggle Market-Hours Scheduling` to restore unrestricted polling.

The Fund view can compare two to six watched funds over 1-month, 3-month,
6-month, 1-year, or full-history ranges. Each NAV series is normalized to period
return and rendered locally; one failed fund does not discard the other series.
The Fund Trends Overview restores the legacy all-fund browser with a searchable
watchlist, current confirmed/estimated NAV summaries, lazy cached history, and
local 1-month through full-history charts. It reuses one editor tab and does not
load legacy remote chart images.
Fund trend, comparison, and market-compass charts use a modular ECharts SVG
runtime bundled locally with the extension. Tooltips, zooming, resizing, and
VS Code theme colors are available without loading scripts or data from a CDN.
Leek Center also includes fixed Stock Connect and main-capital-flow pages, with
direct Fund-view commands and the same sandboxed HTTPS frame allowlist.

Stock, fund, and Binance change sorting persists across restarts using explicit
`original`, `ascending`, and `descending` modes. Legacy numeric sort settings are
mapped automatically. Funds can also be sorted by ascending or descending
position market value, including legacy `fundSort` values `2` and `-2`. Binance
pairs also support persistent top/up/down ordering.

Flash-news sources can be selected independently with `tickerdock.newsSources`.
The optional `TickerDock Flash News` Output Channel records only newly received
items and exposes an unread status item; important-item notifications are a
separate opt-in setting. Initial polling establishes a per-source baseline so
enabling a provider does not report its historical backlog as unread.
