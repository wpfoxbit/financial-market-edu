import type {
  ExchangeAdapter,
  AdapterHandlers,
  ExchangeSubscription,
} from "../types";
import { openReconnectingSocket } from "../types";
import { normalizeFoxbitBook, normalizeFoxbitTrade } from "./foxbit.normalize";

// Endpoint and subscription protocol per Foxbit's v3 public WS. Adjust if the
// API has evolved — Wesley (Foxbit) is best positioned to confirm.
const WS_URL = "wss://api.foxbit.com.br/ws";

const SUPPORTED_SYMBOLS = ["btcbrl", "ethbrl", "solbrl", "xrpbrl", "usdtbrl"] as const;

export class FoxbitAdapter implements ExchangeAdapter {
  readonly id = "foxbit";
  readonly displayName = "Foxbit";

  symbols(): readonly string[] {
    return SUPPORTED_SYMBOLS;
  }

  subscribe(symbol: string, handlers: AdapterHandlers): ExchangeSubscription {
    const sym = symbol.toLowerCase();

    const sock = openReconnectingSocket(
      WS_URL,
      (ws) => {
        ws.send(
          JSON.stringify({
            event: "subscribe",
            channel: "order_book",
            market_symbol: sym,
          }),
        );
        ws.send(
          JSON.stringify({
            event: "subscribe",
            channel: "trades",
            market_symbol: sym,
          }),
        );
      },
      (_ws, ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { channel?: string; data?: unknown };
          if (!msg.channel || !msg.data) return;
          if (msg.channel === "order_book") {
            handlers.onBook?.(
              normalizeFoxbitBook(msg.data as Parameters<typeof normalizeFoxbitBook>[0]),
            );
          } else if (msg.channel === "trades") {
            handlers.onTrade?.(
              normalizeFoxbitTrade(msg.data as Parameters<typeof normalizeFoxbitTrade>[0]),
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
