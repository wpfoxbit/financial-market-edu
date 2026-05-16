import type { OrderBook } from "../orderbook";
import type { Order, Side, Trade } from "../types";
import type { MatchContext } from "./match-market";

export interface LimitMatchResult {
  trades: Trade[];
  resting: Order | null;
}

export function submitLimit(book: OrderBook, order: Order, ctx: MatchContext): LimitMatchResult {
  if (order.type !== "limit") {
    throw new Error(`submitLimit: order ${order.id} is not a limit`);
  }
  if (order.qty <= 0) {
    throw new Error(`submitLimit: order ${order.id} has non-positive qty`);
  }

  const opposite: Side = order.side === "buy" ? "sell" : "buy";
  const trades: Trade[] = [];
  let remaining = order.qty;

  while (remaining > 0) {
    const top = book.peekTop(opposite);
    if (!top) break;

    const crosses = order.side === "buy" ? top.price <= order.price : top.price >= order.price;
    if (!crosses) break;

    const { level, price } = top;
    while (remaining > 0 && !level.isEmpty) {
      const head = level.peek()!;
      const fillQty = Math.min(remaining, head.qty);

      trades.push({
        id: ctx.nextTradeId(),
        price: head.price,
        qty: fillQty,
        buyOrderId: order.side === "buy" ? order.id : head.id,
        sellOrderId: order.side === "sell" ? order.id : head.id,
        aggressorSide: order.side,
        timestamp: ctx.timestamp,
      });

      head.qty -= fillQty;
      remaining -= fillQty;

      if (head.qty === 0) {
        head.status = "filled";
        level.shift();
        book.forgetOrder(head.id);
      } else {
        head.status = "partial";
      }
    }

    if (level.isEmpty) {
      book.dropLevel(opposite, price);
    }
  }

  order.qty = remaining;
  if (remaining === 0) {
    order.status = "filled";
    return { trades, resting: null };
  }

  order.status = trades.length > 0 ? "partial" : "open";
  book.addLimit(order);
  return { trades, resting: order };
}
