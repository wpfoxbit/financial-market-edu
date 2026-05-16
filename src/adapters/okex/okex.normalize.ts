import type { ExchangeBookEvent, ExchangeTradeEvent } from "../types";

export interface OkxBooksRaw {
  asks: [string, string, string, string][];
  bids: [string, string, string, string][];
  ts: string;
  instId?: string;
}

export interface OkxTradeRaw {
  instId: string;
  tradeId: string;
  px: string;
  sz: string;
  /** OKX convention: "buy" or "sell" describes the taker side. */
  side: "buy" | "sell";
  ts: string;
}

export function normalizeOkxBook(raw: OkxBooksRaw, symbol: string): ExchangeBookEvent {
  return {
    symbol: (raw.instId ?? symbol).toLowerCase(),
    bids: raw.bids.map(([p, q]) => ({ price: Number(p), qty: Number(q) })),
    asks: raw.asks.map(([p, q]) => ({ price: Number(p), qty: Number(q) })),
    timestamp: Number(raw.ts),
  };
}

export function normalizeOkxTrade(raw: OkxTradeRaw): ExchangeTradeEvent {
  return {
    id: raw.tradeId,
    symbol: raw.instId.toLowerCase(),
    price: Number(raw.px),
    qty: Number(raw.sz),
    side: raw.side,
    timestamp: Number(raw.ts),
  };
}
