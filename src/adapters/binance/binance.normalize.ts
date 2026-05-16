import type { ExchangeBookEvent, ExchangeTradeEvent } from "../types";

export interface BinanceDepth20Raw {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface BinanceTradeRaw {
  e: "trade";
  E: number;
  s: string;
  t: number;
  p: string;
  q: string;
  T: number;
  /** true → buyer is the maker (taker is sell-side aggressor). */
  m: boolean;
}

export function normalizeBinanceDepth(
  raw: BinanceDepth20Raw,
  symbol: string,
  timestamp: number,
): ExchangeBookEvent {
  return {
    symbol,
    bids: raw.bids.map(([p, q]) => ({ price: Number(p), qty: Number(q) })),
    asks: raw.asks.map(([p, q]) => ({ price: Number(p), qty: Number(q) })),
    timestamp,
  };
}

export function normalizeBinanceTrade(raw: BinanceTradeRaw): ExchangeTradeEvent {
  return {
    id: String(raw.t),
    symbol: raw.s.toLowerCase(),
    price: Number(raw.p),
    qty: Number(raw.q),
    side: raw.m ? "sell" : "buy",
    timestamp: raw.T,
  };
}
