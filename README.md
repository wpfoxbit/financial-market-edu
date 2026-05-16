# Financial Market Edu

An educational trading simulator designed to teach **market microstructure** visually — how a limit order book works, what happens when a market order consumes multiple price levels, what absorption and exhaustion look like in real time — all with **fake assets** and **fully configurable order flow**.

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-5-646cff)
![Tauri](https://img.shields.io/badge/Tauri_2-desktop-ffc131)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Why this exists

Most people learn about financial markets through static diagrams or paper trading on real exchanges where they can't control the environment. This tool lets you **see and control every variable**: the number of orders on each price level, the aggression rate, which side dominates, where absorption happens. You can freeze time, step tick-by-tick, and replay the same scenario with the same seed to study it again.

It is built for:

- **Students** learning order flow and market microstructure for the first time.
- **Educators** who want a visual, controllable demo for classroom or video content.
- **Traders** who want to build intuition about book dynamics without risking real money.

---

## Features

### Main tab — scenario-driven simulation

- **Limit Order Book (DOM)** with real-time depth visualization, spread display, and student order highlighting.
- **Times & Trades** tape showing every execution with aggressor side color-coding.
- **Charts**: Candlestick, Line, Tick (trade-by-trade), Renko, and Point & Figure — all built from the live trade stream.
- **Order Ticket**: place limit and market orders against the simulated book. See your fills, slippage, and P&L in real time.
- **Position & P&L panel**: net position, average entry, realized/unrealized P&L, trade count, average slippage, flatten button.
- **Built-in scenarios** with configurable generators:
  - Liquid market, Illiquid market, Frozen book
  - Aggressive buyers, Aggressive sellers
  - Absorption at a key level
- **Custom scenarios**: create, save, import/export as JSON.
- **Real exchange data**: connect to Binance, Foxbit, Bitstamp, or OKX public WebSocket feeds to view real order book and trades (read-only — your orders always stay in the fake book).
- **Playback controls**: Play, Pause, Step (tick-by-tick), Speed (0.25× to 5×).
- **Quick UX**: click any price in the DOM or T&T to auto-fill the order ticket. Shift+Right-Click on a DOM level to place an instant limit order via popover.

### Sandbox tab — fully customizable

- **Multi-account engine**: create named accounts (manual, liquidity-bot, market-bot) and switch between them.
- **Book setup**: configure mid price, spread, number of levels, quantity per level, and tick size. Initialize or reset the book at any time.
- **Bulk orders**: distribute N limit orders across a price range for any account — e.g., 20 sell orders from 50,001 to 50,010.
- **Bot accounts**: attach automated generators to accounts:
  - *Liquidity bot*: continuously places resting orders on both sides (configurable spread, levels, qty, refresh rate).
  - *Market bot*: fires market orders at a configurable rate and size to move the price.
- **Tick chart**: plots every trade execution as a point — ideal for on-demand trading where candle timeframes don't advance.
- **Same visual components**: the DOM, chart, T&T, order ticket, position panel, and controls are shared with the main tab.

### Cross-cutting

- **Internationalization**: full English and Brazilian Portuguese support. Switch with one click.
- **Desktop app**: same codebase runs as a native desktop app via Tauri 2 (Windows, macOS, Linux).
- **Deterministic replay**: every scenario uses a seeded RNG — same seed, same market, every time.

---

## Quick start

### Prerequisites

- **Node.js 20+** (the repo includes `.nvmrc` — run `nvm use` if you use nvm)
- **npm** (comes with Node)

### Install & run

```bash
git clone https://github.com/wpfoxbit/financial-market-edu.git
cd financial-market-edu
npm install
npm run dev
```

Open **http://localhost:1420** in your browser.

### Available commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 1420) |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run build` | Type-check + production bundle |
| `npm run tauri:dev` | Launch desktop app (dev mode) |
| `npm run tauri:build` | Build desktop installers |

### Desktop app (Tauri 2)

To run the desktop version you also need:

- **Rust toolchain**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Linux system libs** (Ubuntu/Debian):
  ```bash
  sudo apt install -y pkg-config libwebkit2gtk-4.1-dev libsoup-3.0-dev \
    libayatana-appindicator3-dev libxdo-dev librsvg2-dev libssl-dev
  ```
- **macOS**: `xcode-select --install`
- **Windows**: Microsoft C++ Build Tools

Then:

```bash
npm run tauri:dev    # dev mode with hot reload
npm run tauri:build  # production installers
```

First Rust compile takes ~5 minutes; subsequent runs are cached.

---

## Architecture

```
src/
  core/              ← Pure TypeScript — simulation engine, no UI imports
    types/           ← Order, Trade, Level, Side, BookSnapshot, Candle…
    orderbook/       ← Limit order book with FIFO price-time priority
    matching/        ← Market order and limit order matching
    candles/         ← Trade stream → OHLCV candle aggregation
    simulation/      ← Virtual clock, scenario player, generators
    pnl/             ← Position tracking, P&L, slippage metrics
    sandbox/         ← Multi-account engine for sandbox mode
  adapters/          ← Real exchange WebSocket adapters (read-only)
  state/             ← Zustand stores bridging core ↔ UI
  ui/
    context/         ← SimulationContext (shared component bridge)
    components/      ← All React components
    pages/           ← Workspace (main) and SandboxWorkspace
  scenarios/         ← Built-in JSON scenario presets
  i18n/              ← Internationalization (EN, PT-BR)
tests/               ← Vitest test suites
src-tauri/           ← Tauri 2 desktop shell (Rust)
```

### Key design principles

- **`core/` is pure**: no React, no DOM, no browser APIs. This makes it unit-testable without jsdom, extractable to a backend, and reusable in the Tauri desktop shell.
- **One store library**: Zustand only. Three stores: `simulation-store` (main tab), `sandbox-store` (sandbox tab), `tab-store` (active tab).
- **SimulationContext bridge**: shared UI components read from a React context, not from a specific store. This lets DOM, Chart, T&T, OrderTicket, Controls, and PositionPanel work in both tabs without code duplication.
- **Deterministic scenarios**: seeded RNG ensures the same scenario produces the same order flow every time.
- **i18n from day one**: all user-facing strings go through `react-i18next`. No hardcoded text.

---

## Built-in scenarios

| Scenario | What it teaches |
|----------|----------------|
| **Liquid market** | Dense book, balanced flow — baseline for comparison |
| **Illiquid market** | Sparse book, wide spread — how slippage works |
| **Frozen book** | No generators — static book for manual exploration |
| **Aggressive buyers** | Buy-biased market orders — watch the price climb |
| **Aggressive sellers** | Sell-biased market orders — watch the price drop |
| **Absorption at level** | Large resting qty absorbs aggression — key support/resistance concept |

Create your own via the Scenario panel or import/export as JSON.

---

## Real exchange adapters

Connect to live public data (read-only) from:

| Exchange | Symbols |
|----------|---------|
| **Binance** | BTC/USDT, ETH/USDT, SOL/USDT, and more |
| **Foxbit** | BTC/BRL |
| **Bitstamp** | BTC/USD, ETH/USD |
| **OKX** | BTC/USDT, ETH/USDT |

Your orders are **never** sent to a real exchange — matching always happens against the local simulated book.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5 |
| UI | React 19 |
| Build | Vite 5 |
| State | Zustand 5 |
| Charts | TradingView Lightweight Charts |
| i18n | react-i18next |
| Testing | Vitest |
| Desktop | Tauri 2 (Rust) |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes — keep business logic in `core/`, UI strings through `t()`
4. Run `npm test` and `npm run build` to verify
5. Open a pull request

---

## License

MIT
