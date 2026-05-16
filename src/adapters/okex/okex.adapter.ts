import type {
  ExchangeAdapter,
  AdapterHandlers,
  ExchangeSubscription,
} from "../types";
import { openReconnectingSocket } from "../types";
import { normalizeOkxBook, normalizeOkxTrade } from "./okex.normalize";

const WS_URL = "wss://ws.okx.com:8443/ws/v5/public";

const SUPPORTED_SYMBOLS = [
  "BTC-USDT",
  "ETH-USDT",
  "SOL-USDT",
  "XRP-USDT",
  "DOGE-USDT",
  "BTC-USD",
  "ETH-USD",
] as const;

export class OkexAdapter implements ExchangeAdapter {
  readonly id = "okex";
  readonly displayName = "OKX";

  symbols(): readonly string[] {
    return SUPPORTED_SYMBOLS;
  }

  subscribe(symbol: string, handlers: AdapterHandlers): ExchangeSubscription {
    const instId = symbol.toUpperCase();

    const sock = openReconnectingSocket(
      WS_URL,
      (ws) => {
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [
              { channel: "books5", instId },
              { channel: "trades", instId },
            ],
          }),
        );
      },
      (_ws, ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            arg?: { channel?: string };
            data?: unknown[];
          };
          if (!msg.arg || !msg.data || !Array.isArray(msg.data)) return;
          if (msg.arg.channel === "books5") {
            for (const item of msg.data) {
              handlers.onBook?.(
                normalizeOkxBook(item as Parameters<typeof normalizeOkxBook>[0], instId),
              );
            }
          } else if (msg.arg.channel === "trades") {
            for (const item of msg.data) {
              handlers.onTrade?.(
                normalizeOkxTrade(item as Parameters<typeof normalizeOkxTrade>[0]),
              );
            }
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
