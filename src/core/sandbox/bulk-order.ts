import { makeOrder, type Order, type Side } from "../types";
import { roundToStep } from "../simulation/generators/types";

export interface BulkOrderConfig {
  side: Side;
  startPrice: number;
  endPrice: number;
  count: number;
  qtyPerOrder: number;
  tickSize: number;
  qtyStep: number;
  ownerId: string;
  nextOrderId: () => string;
  timestamp: number;
}

/**
 * Distribute `count` limit orders evenly across a price range.
 * Returns the orders (not yet placed in the book).
 */
export function generateBulkOrders(cfg: BulkOrderConfig): Order[] {
  if (cfg.count <= 0) return [];
  const orders: Order[] = [];
  const step = cfg.count === 1 ? 0 : (cfg.endPrice - cfg.startPrice) / (cfg.count - 1);

  for (let i = 0; i < cfg.count; i++) {
    const price = roundToStep(cfg.startPrice + step * i, cfg.tickSize);
    const qty = roundToStep(cfg.qtyPerOrder, cfg.qtyStep);
    orders.push(
      makeOrder({
        id: cfg.nextOrderId(),
        side: cfg.side,
        type: "limit",
        price,
        qty,
        ownerId: cfg.ownerId,
        timestamp: cfg.timestamp,
      }),
    );
  }
  return orders;
}
