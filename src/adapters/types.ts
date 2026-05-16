export interface ExchangeBookEvent {
  symbol: string;
  bids: Array<{ price: number; qty: number }>;
  asks: Array<{ price: number; qty: number }>;
  timestamp: number;
}

export interface ExchangeTradeEvent {
  id: string;
  symbol: string;
  price: number;
  qty: number;
  /** Aggressor side (the taker). */
  side: "buy" | "sell";
  timestamp: number;
}

export type AdapterStatus = "connecting" | "open" | "closed" | "error";

export interface AdapterHandlers {
  onBook?: (e: ExchangeBookEvent) => void;
  onTrade?: (e: ExchangeTradeEvent) => void;
  onError?: (err: Error) => void;
  onStatus?: (status: AdapterStatus) => void;
}

export interface ExchangeSubscription {
  unsubscribe: () => void;
}

export interface ExchangeAdapter {
  readonly id: string;
  readonly displayName: string;
  /** Curated list of supported symbols (no live discovery to avoid REST traffic). */
  symbols(): readonly string[];
  subscribe(symbol: string, handlers: AdapterHandlers): ExchangeSubscription;
}

export interface ReconnectableSocket {
  /** Stop reconnecting and close. */
  close(): void;
}

/**
 * Helper: open a WebSocket with exponential-backoff reconnect.
 */
export function openReconnectingSocket(
  url: string,
  onOpen: (ws: WebSocket) => void,
  onMessage: (ws: WebSocket, ev: MessageEvent) => void,
  handlers: AdapterHandlers,
): ReconnectableSocket {
  let ws: WebSocket | null = null;
  let stopped = false;
  let backoff = 1000;

  const connect = (): void => {
    if (stopped) return;
    handlers.onStatus?.("connecting");
    try {
      ws = new WebSocket(url);
    } catch (err) {
      handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      backoff = 1000;
      handlers.onStatus?.("open");
      if (ws) onOpen(ws);
    };
    ws.onmessage = (ev) => {
      if (ws) onMessage(ws, ev);
    };
    ws.onerror = () => {
      handlers.onError?.(new Error(`WebSocket error: ${url}`));
      handlers.onStatus?.("error");
    };
    ws.onclose = () => {
      handlers.onStatus?.("closed");
      if (!stopped) scheduleReconnect();
    };
  };

  const scheduleReconnect = (): void => {
    setTimeout(connect, backoff);
    backoff = Math.min(30_000, backoff * 2);
  };

  connect();

  return {
    close: () => {
      stopped = true;
      try {
        ws?.close();
      } catch {
        // ignore
      }
    },
  };
}
