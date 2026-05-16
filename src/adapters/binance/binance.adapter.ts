import type {
  ExchangeAdapter,
  AdapterHandlers,
  ExchangeSubscription,
} from "../types";
import { openReconnectingSocket } from "../types";
import { normalizeBinanceDepth, normalizeBinanceTrade } from "./binance.normalize";

const WS_URL = "wss://stream.binance.com:9443/stream";

const SUPPORTED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "MATICUSDT",
] as const;

export class BinanceAdapter implements ExchangeAdapter {
  readonly id = "binance";
  readonly displayName = "Binance";

  symbols(): readonly string[] {
    return SUPPORTED_SYMBOLS;
  }

  subscribe(symbol: string, handlers: AdapterHandlers): ExchangeSubscription {
    const sym = symbol.toLowerCase();
    const url = `${WS_URL}?streams=${sym}@depth20@100ms/${sym}@trade`;

    const sock = openReconnectingSocket(
      url,
      () => {
        // Binance auto-subscribes via URL query — no subscribe message needed.
      },
      (_ws, ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { stream?: string; data?: unknown };
          if (!msg.stream || !msg.data) return;
          if (msg.stream.endsWith("@trade")) {
            handlers.onTrade?.(normalizeBinanceTrade(msg.data as Parameters<typeof normalizeBinanceTrade>[0]));
          } else if (msg.stream.includes("@depth")) {
            handlers.onBook?.(
              normalizeBinanceDepth(
                msg.data as Parameters<typeof normalizeBinanceDepth>[0],
                sym,
                Date.now(),
              ),
            );
          }
        } catch (err) {
          handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      },
      handlers,
    );

    return { unsubscribe: () => sock.close() };
  }
}
