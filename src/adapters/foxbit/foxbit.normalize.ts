import type { ExchangeBookEvent, ExchangeTradeEvent } from "../types";

// Foxbit's public WebSocket is reachable; payload shapes here are written to
// match the v3 spec. Wesley (Foxbit) — adjust if the API has evolved.

export interface FoxbitOrderBookRaw {
  market_symbol: string;
  bids: Array<{ price: string; quantity: string }>;
  asks: Array<{ price: string; quantity: string }>;
  timestamp?: number;
}

export interface FoxbitTradeRaw {
  market_symbol: string;
  id: number | string;
  price: string;
  quantity: string;
  /** Foxbit convention: "buy" or "sell" is the taker side. */
  taker_side: "buy" | "sell";
  created_at: string | number;
}

export function normalizeFoxbitBook(raw: FoxbitOrderBookRaw): ExchangeBookEvent {
  return {
    symbol: raw.market_symbol.toLowerCase(),
    bids: raw.bids.map((b) => ({ price: Number(b.price), qty: Number(b.quantity) })),
    asks: raw.asks.map((a) => ({ price: Number(a.price), qty: Number(a.quantity) })),
    timestamp: raw.timestamp ?? Date.now(),
  };
}

export function normalizeFoxbitTrade(raw: FoxbitTradeRaw): ExchangeTradeEvent {
  const ts =
    typeof raw.created_at === "number" ? raw.created_at : new Date(raw.created_at).getTime();
  return {
    id: String(raw.id),
    symbol: raw.market_symbol.toLowerCase(),
    price: Number(raw.price),
    qty: Number(raw.quantity),
    side: raw.taker_side,
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
  };
}
