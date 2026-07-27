# Migration Plan

## Completed foundation

- pnpm workspace with isolated domain, data-source, and extension packages.
- Node 18-compatible VS Code extension target (`vscode ^1.85.0`).
- Stable internal stock and fund quote contracts.
- Legacy Leek Fund stock-code translation at the adapter boundary.
- `stock-api` adapter for A-share, Hong Kong, and US quotes, search, and K-lines.
- `fund-api` adapter for fund NAV, search, and NAV history.
- Disposable non-overlapping refresh scheduling.
- Stock and fund TreeViews using `tickerdock.*` settings with `leek-fund.*` fallback.
- Custom stock watchlist groups with add, rename, remove, and group-local stock
  management commands. Legacy flat lists migrate into `My Stocks`.
- Unit tests for code translation, data normalization, missing results, and scheduling.
- Grouped fund watchlists with add, rename, remove, and fund management commands.
- Debounced live-search Quick Picks for adding stocks, funds, and Binance pairs,
  with stale asynchronous results discarded.
- Stock and fund position editing with legacy `stockPrice` and `fundAmount` compatibility.
- Local batch stock/fund position managers with host-validated payloads, stale
  position cleanup, and atomic configuration replacement.
- Theme-safe held-stock label highlighting and an explicit Holding marker with
  legacy `stockHeldTipShow` compatibility.
- Pure portfolio calculations, sold-out position handling, and portfolio status bars.
- Intraday fund estimates kept separate from confirmed `fund-api` NAV data.
- Stock price and percentage reminders with threshold crossing and cooldown behavior.
- Dedicated Sina futures adapter for existing `nf_` and `hf_` watchlist codes.
- Stock and fund display sorting plus persistent top/up/down watchlist commands.
- Fixed-origin sandboxed stock trend iframes plus a script-disabled fund NAV
  history Webview.
- Binance pair management and 24-hour quote TreeView.
- Bank of China forex quote TreeView with an independent low-frequency refresh cycle.
- Combined Jin10 and XuanGuBao REST flash-news TreeView with source selection,
  important-only filtering, source-qualified deduplication, and fixed-host
  external detail links.
- Opt-in flash-news Output Channel, unread status item, recent-item tooltip, and
  important-item notifications with per-source initial baselines.
- Native fund top-holdings view parsed from EastMoney data.
- Native extended fund details with metadata, period returns, profitability
  probabilities, diagnostic scores, institution ratings, similar funds, and
  top holdings. Four upstream sources fail independently.
- Native EastMoney daily fund ranking and industry/concept/region net-inflow views.
- Native Bull/Bear Market Compass with A-share breadth, price distribution, hot
  themes, and filtered Stock Connect flow data.
- Responsive Leek Center shell with 14 allowlisted embedded data pages.
- Loopback-only, fixed-target EastMoney proxy for stock details and Stock Wind
  Vane, with response-header cleanup and no arbitrary destination forwarding.
- Leek Center loading timeout, reload, state restoration, external-open fallback, and iframe sandbox.
- Opt-in Xueqiu followed-user TreeView and timeline with SecretStorage Cookie handling.
- Xueqiu HTML sanitization, fixed-host external links, and independent refresh scheduling.
- Secure AI configuration using SecretStorage for API keys.
- OpenAI Responses API and Chat Completions compatible text clients.
- General AI research and stock K-line analysis with script-disabled result Webviews.
- Versioned settings export and validated legacy/new settings import with automatic backup and rollback.
- Secret fields explicitly excluded from all settings transfer paths.
- Theme-aware market status bar with up to four selected stock quotes and direct K-line navigation.
- Independent portfolio, market-quote, and direction-icon status-bar controls with legacy visibility fallback.
- Fixed EastMoney standard/chip-distribution stock pages routed through the
  constrained local service, with host-constructed destinations and legacy mode compatibility.
- Interactive native fund trend pages with host-validated period switching.
- Binance K-line adapter with normalized OHLCV output and bounded history requests.
- Original embedded TradingView Binance spot details with host-validated symbols
  and a fixed CSP-restricted iframe origin.
- One reusable default-detail editor per stock, fund, and Binance type, with
  stale fund-history responses prevented from overwriting a newer selection.
- Local SVG fund unit-NAV/accumulated-NAV rendering without remote chart scripts.
- Currency-aware stock profits with Bank of China HKD/USD-to-CNY normalization for portfolio totals.
- Explicit exclusion warnings when a required exchange rate is unavailable.
- Versioned reminder snapshot and cooldown persistence with validation, expiry, and coalesced writes.
- Per-market automatic refresh filtering for A/HK/US stocks, domestic/global futures, and funds.
- IANA-time-zone sessions, US daylight-saving handling, 2026 exchange holidays, and cross-midnight futures rules.
- Forced initial/manual refreshes plus an opt-out command for unrestricted polling.
- Local multi-fund normalized performance comparison for two to six watched funds.
- Stock Connect and main-capital-flow pages added after live response-header verification.
- Persistent stock, fund, and Binance sorting with legacy numeric-mode conversion.
- Persistent fund position-value sorting with legacy `fundSort` values `2` and
  `-2` mapped to ascending and descending modes.
- Binance pair top/up/down ordering stored in the existing compatible watchlist configuration.
- Settings TreeView with direct Leek Center, AI assistant, and personalization entries.
- Independent stock and fund portfolio status-bar visibility with legacy fund-bar fallback.
- Conditional legacy command aliases for compatible no-item actions; aliases stay disabled while `iarjian.leek-fund` is installed.
- Stable Jiuyangongshe stock-research adapter using the current public web-client timestamp signature, with a script-disabled detail list and bounded AI context.
- Stock reminder master toggle with legacy command compatibility.
- Dedicated personalization editor with validated stock/fund/status templates,
  icon styles, status colors, chart defaults, highlights, reminders, and
  status-bar visibility controls.
- Legacy `labelFormat`, `iconType`, `riseColor`, and `fallColor` migration without
  workbench CSS injection.
- Original arrow, reverse-color arrow, food, Emoji-food, and no-icon assets and
  change-threshold mappings.
- VS Code 1.85.2 Extension Host smoke tests for activation, all contributed
  commands, and live configuration reload.
- Minimal side-by-side beta VSIX packaging under the local
  `tickerdock.tickerdock` extension identifier.

## Compatibility rules

1. Keep persisted user codes in their existing format.
2. Convert codes only inside a data-source adapter.
3. Keep new command and view IDs separate so beta and legacy extensions can run together.
4. Represent percentage changes as ratios internally (`0.01` means `1%`).
5. Never substitute confirmed fund NAV for an intraday estimate.
6. Missing data must use an explicit `unavailable` status instead of numeric zero semantics.
7. UI packages may depend on domain contracts, never on `stock-api` or `fund-api` types.

## Next implementation slices

### 1. Fund groups and portfolio calculations (completed)

- Restore grouped fund TreeView nodes.
- Introduce `Holding`, `Position`, and `ProfitSummary` domain models.
- Migrate stock and fund cost-basis calculations into pure functions.
- Add fixture tests for buy, partial sell, sell-out, and same-day position changes.

### 2. Intraday fund estimates (completed)

- Add a separate `FundEstimateGateway` for estimated NAV and estimate time.
- Merge estimates with confirmed `fund-api` NAV in the application layer.
- Mark stale estimates and never use them after their trading date.

### 3. Futures and additional markets (completed foundation)

- `nf_` and `hf_` handling now lives in a dedicated futures gateway.
- Preserve current configuration codes and route them before `stock-api` conversion.
- Add market-calendar-aware refresh policies.
- Binance and Bank of China forex adapters now run through dedicated gateways.

### 4. Commands and configuration (completed foundation)

- Migrate add, delete, reorder, pin, cost basis, and reminder commands by feature module.
- Add versioned configuration migrations and backup before first write.
- Keep old command identifiers until at least one stable migration release has shipped.
- Import legacy flat settings through an allowlisted schema and map renamed compatibility fields.
- Back up current settings before import and restore written values if an update fails.

### 5. Status bar and reminders (completed foundation)

- Build status items from application-level quote snapshots.
- Make reminder evaluation a pure domain service.
- Persist trigger state so a restart does not repeat the same notification.
- Restore selected market quote items without carrying forward arbitrary label templates or theme-breaking colors.
- Map legacy `statusBarStock` and `hideStatusBar*` values to explicit new settings.

### 6. Webview

- Create a separate React package only after application services stabilize.
- Define a runtime-validated request/response protocol.
- Do not forward arbitrary Axios options from the Webview.
- Store AI credentials in VS Code SecretStorage.
- Keep native fund/Binance trend requests in the extension host and accept only
  allowlisted period identifiers from Webviews.
- Construct stock iframe destinations in the extension host from strict code
  patterns and fixed EastMoney/Sina origins. Only EastMoney pages use the
  loopback proxy; never accept a target URL from Webview state.

### 7. Release readiness

- Add VS Code integration tests for activation, commands, and configuration reload. (completed foundation)
- Add captured response fixtures for every supported provider.
- Package a beta VSIX alongside the legacy extension. (completed)
- Install the beta VSIX and perform a clean-profile restart smoke test.
- Compare watchlist order, displayed values, refresh behavior, and resource usage.
- Confirm the final Marketplace publisher, repository URL, and project license
  before public distribution.

### 8. Xueqiu and AI (completed foundation)

- Require the user to explicitly provide an authenticated Xueqiu Cookie.
- Keep Cookie and AI API keys out of settings, logs, and Webview state.
- Normalize Xueqiu profiles and timelines behind domain gateway contracts.
- Remove active HTML from timeline content and validate external destinations in the extension host.
- Prefer the Responses API for OpenAI while preserving a Chat Completions compatibility mode.
- Build AI stock prompts from normalized `StockGateway` K-lines rather than legacy provider payloads.
- Enrich stock-analysis prompts with bounded, allowlisted fields from the
  currently enabled composite flash-news feed; provider failure does not block
  K-line analysis.
- Restore selectable `1w`, `1m`, `3m`, `6m`, and `1y` AI stock-history ranges
  with legacy-setting compatibility.
- Record successful AI responses in a dedicated timestamped Output Channel
  without credentials, request headers, or raw analysis inputs.

### 9. Flash news (completed foundation)

- Merge Jin10 and XuanGuBao behind a composite domain gateway.
- Keep provider failures isolated so one available feed still refreshes the view.
- Qualify seen IDs by source and establish a baseline before counting unread
  items from a newly enabled provider.
- Construct trusted XuanGuBao article URLs locally instead of forwarding remote
  route values.
- Keep Output Channel logging and important-news notifications independently
  opt-in.

Jiuyangongshe stock research now uses the signature implemented by the current
public website rather than the legacy Baidu ETag workaround. It remains isolated
from quote refreshes and returns no credentials or arbitrary destinations.

### Stock extended details

The stock detail migration now provides a native editor page for the former
Leek Center stock information panel. It loads the normalized quote and daily
K-lines through the stock gateway, calculates 20-day and 60-day averages plus
recent support, resistance, take-profit, and stop-loss reference levels, and
adds bounded Jiuyangongshe related research. A single reusable editor tab is
used for all stocks.

The old iWencai integration is restored using its original security boundary:
the local detail Webview runs the bundled browser fingerprint module to create
a short-lived `hexin-v` token, then the extension host calls only the fixed
`stockpick/load-data` and `diag/block-detail` endpoints. Diagnosis, score,
short/mid/long views, concepts, heat, official price levels, and institution
reports are normalized before rendering. Remote HTML is converted to text,
and the Webview cannot provide an arbitrary destination or request options.

### Fund trends overview

The legacy all-fund trend browser is restored as a local, theme-native page.
It shows a searchable deduplicated watchlist, confirmed and estimated NAV
summaries, and 1-month through full-history unit/accumulated NAV charts. Fund
history is loaded only when selected and cached for the panel lifetime. The
page reuses one editor tab and replaces the legacy remote GIF charts with
normalized `fund-api` data rendered locally.

Fund NAV, comparison, price-distribution, and Stock Connect flow charts now
share a modular ECharts SVG runtime. The browser bundle is packaged inside the
extension, restricted through Webview CSP and local resource roots, and reads
VS Code theme colors at startup. Structured chart options are generated by the
extension host and embedded as escaped inert JSON; Webviews do not accept
remote scripts or arbitrary chart configuration messages.

## Remaining legacy features

- Legacy workbench-wide immersive CSS injection is intentionally replaced by theme-native Webviews.
- Donation, community, telemetry, and update-notification pages, which require an explicit product decision rather than a direct code migration.
- Remaining third-party pages that are not part of the allowlisted Leek Center catalog.

New embedded pages must pass the same HTTPS, response-header, CSP, and visual checks before entering the catalog. Settings export must never include SecretStorage values.
