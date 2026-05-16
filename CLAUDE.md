# Financial Market Edu

Educational trading simulator. The goal is to teach **market microstructure** visually — how a limit order book works, what an aggression actually consumes, what absorption looks like, what an exhaustion looks like — with **fake assets and fully configurable order flow**.

Live in `index.html` at <http://localhost:5173> after `npm run dev`.

## Architectural rule #1: keep `core/` pure

`src/core/` contains the simulation engine — order book, matching, candle aggregation, generators, scenario player, PnL, and the sandbox engine. **It must not import from React, the DOM, or any UI library.** That isolation is what makes it possible to:

1. Unit-test the engine in isolation (Vitest, no jsdom required for `core/` tests).
2. Package the same codebase as a desktop app with Tauri 2 (Phase 7) without refactoring.
3. Extract `core/` into a Node.js backend later for a multi-user version — without rewriting business logic.

If you're tempted to put simulation state into a React component, stop and put it in `core/` (or `state/`, which is the Zustand layer that bridges core ↔ UI).

## Project layout

```
src/
  core/              ← pure TS — engine, no DOM/React imports
    types/           ← Order, Trade, Level, Side, BookSnapshot, Candle…
    orderbook/       ← LOB with FIFO priority per level
    matching/        ← matches market orders against the book
    candles/         ← aggregates trades → candles per timeframe
    simulation/
      clock.ts       ← virtual 100ms-tick clock with speed control
      generators/    ← liquidity, aggression, absorption, volatility
      scenario.ts    ← scenario serialization + player
    pnl/             ← student position + PnL + execution metrics
    sandbox/         ← multi-account sandbox engine (fully customizable mode)
      account.ts     ← Account type, AccountId, create/reset helpers
      sandbox-engine.ts ← SandboxEngine: multi-account, bot-attachable
      book-initializer.ts ← uniform book seeding with per-level overrides
      bulk-order.ts  ← distribute N limit orders across a price range
  adapters/          ← real exchanges (read-only public data)
    binance/  foxbit/  bitstamp/  okex/
  state/             ← Zustand stores — thin, delegate to core
    simulation-store.ts ← main simulation state (single-student, scenario-driven)
    sandbox-store.ts    ← sandbox state (multi-account, user-controlled)
    tab-store.ts        ← active tab (main | sandbox)
  ui/
    context/         ← SimulationContext bridge (components read from context, not store)
    components/      ← Chart, DOM, TimesAndTrades, OrderTicket, ScenarioPanel, AssetManager,
                       AccountManager, BookSetup, BulkOrderPanel, BotConfig, TabBar, QuickOrderPopover
    pages/
      Workspace.tsx        ← main tab layout
      SandboxWorkspace.tsx ← sandbox tab layout
  scenarios/         ← built-in JSON presets
  i18n/              ← i18next config + locales/{en,pt-BR}.json
tests/               ← Vitest, focused on core/
```

## Two modes: Main tab & Sandbox tab

The app has two tabs, switchable via the header `TabBar`:

### Main tab
- Scenario-driven simulation with auto-generated order flow (generators).
- Single student account, pre-built scenarios, real-exchange data source option.
- Click on a price in DOM or T&T → auto-fills the OrderTicket (price + side, switches to Limit).
- Shift+Right-Click on a DOM price → opens a QuickOrderPopover for instant limit order placement.

### Sandbox tab
- Fully user-controlled: no generators run unless explicitly attached to bot accounts.
- **Multi-account**: create named accounts (manual, liquidity-bot, market-bot).
- **Book setup**: configure mid price, spread, number of levels, qty per level, tick size. Initialize/reset.
- **Bulk orders**: place N limit orders distributed across a price range, per account.
- **Bot accounts**: attach `LiquidityGen` or `AggressionGen` to bot accounts with configurable params.
- **Tick chart**: trade-by-trade chart that updates on every execution (no timeframe aggregation).
- Same visual components (Chart, DOM, T&T, OrderTicket, PositionPanel, StudentOrders) via the shared `SimulationContext`.

## SimulationContext (component reuse bridge)

Shared UI components (DOM, Chart, TimesAndTrades, OrderTicket, Controls, PositionPanel, StudentOrders) read from a `SimulationContext` instead of importing a specific store. Each workspace wraps its children with `SimulationProvider`, backed by:

- `useMainAdapter()` → reads from `useSimulationStore` (main tab)
- `useSandboxAdapter()` → reads from `useSandboxStore` (sandbox tab)

This allows full component reuse without duplication. If adding a new shared component, use `useSimulation()` context hook — never import `useSimulationStore` or `useSandboxStore` directly in shared components.

## Domain decisions

- **Tick granularity**: virtual clock fires every 100 ms (configurable speed 0.25× – 10× and step-by-step). No sub-100ms simulation — we don't need HFT realism, we need pedagogical clarity.
- **Order book**: `Map<price, FIFOQueue<Order>>` per side. Limit orders match by price-then-time. Market orders walk levels until filled or exhausted.
- **Candles**: aggregated from the trade stream in `core/candles/`, not stored on disk. Multi-timeframe by rebuilding from the trade log.
- **Chart types**: Candle, Line, Tick (trade-by-trade), Renko, P&F. Tick chart is ideal for sandbox mode where trades happen on-demand.
- **Scenarios**: JSON-serializable. Built-in presets in `src/scenarios/`. User-customized scenarios persist to `localStorage` and can be exported/imported as `.json`.
- **Sandbox accounts**: each account has its own `Position`, `openOrderIds` set, and optional attached generator (bot). Orders carry `ownerId = accountId`; the `SandboxEngine` routes trade fills back to the correct account.
- **Real-exchange data (Phase 6)**: read-only public feeds via native WebSocket. The student's orders never go to a real exchange — matching always happens against the *fake* book.

## Naming conventions

- File names: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- Types/interfaces: PascalCase, no `I` prefix (`Order`, not `IOrder`).
- Stores: `useXxxStore` (e.g. `useSimulationStore`, `useSandboxStore`, `useTabStore`).
- All user-facing strings go through `t()` from `react-i18next`. Default language is **English**. Portuguese (`pt-BR`) is the second locale.

## Workflow

- `npm run dev` — Vite dev server on **port 1420** (locked via `strictPort`).
- `npm test` — Vitest single run. `npm run test:watch` for TDD on `core/`.
- `npm run lint` — ESLint. `npm run format` — Prettier.
- `npm run build` — type-check (`tsc -b`) then bundle.
- `npm run tauri:dev` — Tauri 2 desktop shell pointing at the Vite dev server.
- `npm run tauri:build` — Production desktop bundle (per-OS installers under `src-tauri/target/release/bundle/`).

## Tauri (desktop)

The desktop shell lives in `src-tauri/` (Tauri 2, Rust). Web codebase is reused as-is — Tauri serves the built `dist/` over a custom protocol.

**Prerequisites:**

- Rust toolchain (`rustup`, `cargo`). Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal`.
- Linux system libs (Ubuntu/Debian):
  ```
  sudo apt install -y pkg-config libwebkit2gtk-4.1-dev libsoup-3.0-dev \
    libayatana-appindicator3-dev libxdo-dev librsvg2-dev libssl-dev
  ```
- On macOS, install Xcode CLT (`xcode-select --install`). On Windows, install Microsoft C++ Build Tools.

After prereqs are in place, `npm run tauri:dev` boots the desktop window; the first compile of the Rust shell takes ~5 min, subsequent runs are cached.

The Tauri `identifier` is `br.com.financial-market-edu` (change in `src-tauri/tauri.conf.json` when shipping under a different brand). Window defaults: 1400×900 with min 1100×700.

**Do not commit** `src-tauri/target/` (build artifacts) or `src-tauri/gen/` (generated schemas). **Do commit** `src-tauri/Cargo.lock` — this is a binary crate, so the lock guarantees reproducible builds.

## Skills available in `.claude/skills/`

When extending the project, prefer using the project skills:

- **add-scenario-generator** — scaffold a new generator (e.g. a new behavior like "iceberg refresher" or "spoofing pattern"). Keeps the `Generator` interface contract and adds tests.
- **add-exchange-adapter** — scaffold a new exchange connector (Phase 6). Conforms to the shared `ExchangeAdapter` interface, with normalized symbol/book/trade shapes.
- **add-scenario-preset** — create a new JSON preset under `src/scenarios/`, with proper validation and an entry in the preset registry.
- **add-sandbox-bot** — add a new bot type for the sandbox tab. Wires a generator as an automated account (e.g. iceberg-bot, scalper-bot). Covers `AccountKind`, store action, BotConfig UI, and i18n.

Invoke them by name (e.g. `/add-scenario-generator iceberg-refresher`) when adding the corresponding piece — they enforce conventions so the codebase stays coherent.

## What NOT to do

- Don't put business logic in components. Logic lives in `core/`; UI just renders.
- Don't introduce a Redux/MobX/jotai alongside Zustand — one store library.
- Don't add real-exchange dependencies (SDKs). Use native `WebSocket`.
- Don't hardcode user-facing strings. Use `t()`.
- Don't write comments that restate the code. Domain comments only when the *why* is non-obvious.
- Don't import `useSimulationStore` or `useSandboxStore` directly in shared components — use `useSimulation()` from the context.
