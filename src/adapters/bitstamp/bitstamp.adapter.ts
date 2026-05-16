import type {
  ExchangeAdapter,
  AdapterHandlers,
  ExchangeSubscription,
} from "../types";
import { openReconnectingSocket } from "../types";
import { normalizeBitstampBook, normalizeBitstampTrade } from "./bitstamp.normalize";

const WS_URL = "wss://ws.bitstamp.net";

const SUPPORTED_SYMBOLS = [
  "btcusd",
  "ethusd",
  "xrpusd",
  "ltcusd",
  "btceur",
  "etheur",
  "soleur",
] as const;

export class BitstampAdapter implements ExchangeAdapter {
  readonly id = "bitstamp";
  readonly displayName = "Bitstamp";

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
            event: "bts:subscribe",
            data: { channel: `order_book_${sym}` },
          }),
        );
        ws.send(
          JSON.stringify({
            event: "bts:subscribe",
            data: { channel: `live_trades_${sym}` },
          }),
        );
      },
      (_ws, ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            event?: string;
            channel?: string;
            data?: unknown;
          };
          if (msg.event !== "data" || !msg.channel || !msg.data) return;
          if (msg.channel.startsWith("order_book_")) {
            handlers.onBook?.(
              normalizeBitstampBook(
                msg.data as Parameters<typeof normalizeBitstampBook>[0],
                sym,
              ),
            );
          } else if (msg.channel.startsWith("live_trades_")) {
            handlers.onTrade?.(
              normalizeBitstampTrade(
                msg.data as Parameters<typeof normalizeBitstampTrade>[0],
                sym,
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
