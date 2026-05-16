import { makeOrder } from "../types";
import type { OrderBook } from "../orderbook";
import { roundToStep } from "../simulation/generators/types";

export interface SandboxBookConfig {
  midPrice: number;
  spread: number;
  /** Total number of levels (split evenly bid/ask). Default 52 (26+26). */
  levels: number;
  /** Default qty per level. */
  defaultQty: number;
  /** Per-price volume overrides. */
  customVolumes: Map<number, number>;
  tickSize: number;
  qtyStep: number;
  nextOrderId: () => string;
}

/**
 * Seed a sandbox order book with uniform levels and optional per-level overrides.
 * No RNG — deterministic and fully user-controlled.
 */
export function seedSandboxBook(book: OrderBook, cfg: SandboxBookConfig): void {
  const halfLevels = Math.floor(cfg.levels / 2);
  const bestBid = roundToStep(cfg.midPrice - cfg.spread / 2, cfg.tickSize);
  const bestAsk = roundToStep(cfg.midPrice + cfg.spread / 2, cfg.tickSize);

  for (let i = 0; i < halfLevels; i++) {
    const bidPrice = roundToStep(bestBid - i * cfg.tickSize, cfg.tickSize);
    const askPrice = roundToStep(bestAsk + i * cfg.tickSize, cfg.tickSize);

    const bidQty = roundToStep(cfg.customVolumes.get(bidPrice) ?? cfg.defaultQty, cfg.qtyStep);
    const askQty = roundToStep(cfg.customVolumes.get(askPrice) ?? cfg.defaultQty, cfg.qtyStep);

    if (bidQty > 0) {
      book.addLimit(
        makeOrder({
          id: cfg.nextOrderId(),
          side: "buy",
          type: "limit",
          price: bidPrice,
          qty: bidQty,
          ownerId: "sandbox-seed",
          timestamp: 0,
        }),
      );
    }

    if (askQty > 0) {
      book.addLimit(
        makeOrder({
          id: cfg.nextOrderId(),
          side: "sell",
          type: "limit",
          price: askPrice,
          qty: askQty,
          ownerId: "sandbox-seed",
          timestamp: 0,
        }),
      );
    }
  }
}
