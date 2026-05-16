import { makeOrder } from "../types";
import { nextOrderId } from "../ids";
import type { OrderBook } from "../orderbook";
import type { RNG } from "../utils/rng";

export interface SeedBookOptions {
  mid: number;
  spread: number;
  levels: number;
  qtyPerLevel: number;
  tickSize: number;
  qtyStep: number;
  /** When provided, qty variance is seeded for full reproducibility. */
  rng?: RNG;
}

export function seedBook(book: OrderBook, opts: SeedBookOptions): void {
  const rand = opts.rng ? () => opts.rng!.next() : Math.random;
  const bestBid = roundToStep(opts.mid - opts.spread / 2, opts.tickSize);
  const bestAsk = roundToStep(opts.mid + opts.spread / 2, opts.tickSize);

  for (let i = 0; i < opts.levels; i++) {
    const bidPrice = roundToStep(bestBid - i * opts.tickSize, opts.tickSize);
    const askPrice = roundToStep(bestAsk + i * opts.tickSize, opts.tickSize);
    const bidQty = roundToStep(opts.qtyPerLevel * (0.6 + rand() * 0.8), opts.qtyStep);
    const askQty = roundToStep(opts.qtyPerLevel * (0.6 + rand() * 0.8), opts.qtyStep);

    book.addLimit(
      makeOrder({
        id: nextOrderId(),
        side: "buy",
        type: "limit",
        price: bidPrice,
        qty: bidQty,
        ownerId: "seed",
        timestamp: 0,
      }),
    );
    book.addLimit(
      makeOrder({
        id: nextOrderId(),
        side: "sell",
        type: "limit",
        price: askPrice,
        qty: askQty,
        ownerId: "seed",
        timestamp: 0,
      }),
    );
  }
}

function roundToStep(v: number, step: number): number {
  return Math.round(v / step) * step;
}
