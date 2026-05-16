import type { ExchangeBookEvent, ExchangeTradeEvent } from "../types";

export interface BitstampOrderBookRaw {
  timestamp: string;
  microtimestamp: string;
  bids: [string, string][];
  asks: [string, string][];
}

export interface BitstampTradeRaw {
  id: number;
  timestamp: string;
  amount: number | string;
  price: number | string;
  /** Bitstamp convention: 0 = buy, 1 = sell (aggressor side). */
  type: 0 | 1;
  microtimestamp: string;
}

export function normalizeBitstampBook(
  raw: BitstampOrderBookRaw,
  symbol: string,
): ExchangeBookEvent {
  return {
    symbol,
    bids: raw.bids.map(([p, q]) => ({ price: Number(p), qty: Number(q) })),
    asks: raw.asks.map(([p, q]) => ({ price: Number(p), qty: Number(q) })),
    timestamp: Math.floor(Number(raw.microtimestamp) / 1000),
  };
}

export function normalizeBitstampTrade(
  raw: BitstampTradeRaw,
  symbol: string,
): ExchangeTradeEvent {
  return {
    id: String(raw.id),
    symbol,
    price: Number(raw.price),
    qty: Number(raw.amount),
    side: raw.type === 0 ? "buy" : "sell",
    timestamp: Math.floor(Number(raw.microtimestamp) / 1000),
  };
}
