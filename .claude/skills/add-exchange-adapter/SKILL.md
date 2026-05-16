---
name: add-exchange-adapter
description: Scaffold a new real-exchange adapter under src/adapters/ for streaming public market data (order book and trades). Use when adding support for a new crypto exchange (Binance, Foxbit, Bitstamp, OKEx, Kraken, Coinbase, Bybit, etc.). Adapters are read-only — they feed the chart and DOM with real public data, they never route the student's orders.
---

# Add an exchange adapter

An **adapter** subscribes to a real exchange's **public** WebSocket and emits normalized `BookSnapshot` / `Trade` events into the app, alongside the fake simulator. Adapters are read-only. The student's orders are *always* matched against the local fake book — never sent to the real exchange.

## When to invoke this skill

When the user asks to support a new exchange. Examples:
- "Add Kraken adapter"
- "Connect to Coinbase public WS"
- "I want to see Foxbit BTC-BRL real-time"

## Steps to follow

1. **Confirm the exchange and instrument scope** with the user:
   - Exchange name + their public WS docs URL.
   - Symbols they want supported (or "all available symbols").
   - Whether they need book depth, trades, or both. Default: both.

2. **Read the contract**: open `src/adapters/types.ts` (the `ExchangeAdapter` interface) and at least one existing adapter (`binance/` is the reference implementation) to see the expected methods and normalized event shapes.

3. **Create the directory** `src/adapters/<exchange-name>/` with:
   - `<exchange-name>.adapter.ts` — class implementing `ExchangeAdapter`.
   - `<exchange-name>.symbols.ts` — list/discovery of supported symbols.
   - `<exchange-name>.normalize.ts` — pure functions translating raw exchange messages → normalized `BookSnapshot` / `Trade`.
   - `<exchange-name>.adapter.test.ts` — unit tests for the normalize functions (no real WS calls in tests).

4. **Register it** in `src/adapters/index.ts` so the AssetManager UI can list it as a data source.

5. **Add i18n keys** for the exchange display name under `src/i18n/locales/{en,pt-BR}.json` (key: `adapters.<exchange-name>.label`).

6. **Document quirks** in a short header comment at the top of the adapter file if the exchange has unusual behavior (delta-only updates, snapshot+diff protocol, rate limits, weird symbol naming).

## Hard rules

- Use native `WebSocket` only — do **not** add an exchange SDK as a dependency.
- Adapters MUST normalize all output to the shared `BookSnapshot` / `Trade` types. The rest of the app must not know which exchange a feed came from.
- Adapters MUST NOT import from `src/ui/`, `src/state/`, or `src/core/simulation/`. The only `core/` types they touch are the shared domain types.
- Adapters MUST handle reconnection with exponential backoff, capped (e.g. max 30s).
- Adapters MUST expose `unsubscribe()` and clean up listeners properly.
- Tests cover the `normalize` functions against captured raw messages (paste a real frame from the docs into a fixture). Tests MUST NOT open real connections.

## Common pitfalls

- **Snapshot vs diff protocol**: many exchanges send an initial snapshot followed by incremental diffs. Apply diffs to a local mirror, emit a full normalized snapshot per change (or a delta if the consumer supports it — check `BookSnapshot` shape first).
- **Symbol normalization**: `BTCUSDT` (Binance) vs `BTC-USD` (Coinbase) vs `tBTCUSD` (Bitfinex) vs `BTCBRL` (Foxbit). Always normalize on input/output.
- **Decimal precision**: never use floats for price/qty. Use string-based decimal or scaled integers.

## After done

Tell the user how to point the chart/DOM at the new feed via the AssetManager UI and confirm at least one symbol works end-to-end.
