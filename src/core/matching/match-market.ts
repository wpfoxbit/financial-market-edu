import type { OrderBook } from "../orderbook";
import type { Side, Trade } from "../types";

export interface MatchContext {
  nextTradeId: () => string;
  timestamp: number;
}

export interface MarketMatchResult {
  trades: Trade[];
  filled: number;
  unfilled: number;
}

export function matchMarket(
  book: OrderBook,
  side: Side,
  qty: number,
  takerOrderId: string,
  ctx: MatchContext,
): MarketMatchResult {
  if (qty <= 0) {
    throw new Error(`matchMarket: qty must be > 0, got ${qty}`);
  }

  const opposite: Side = side === "buy" ? "sell" : "buy";
  const trades: Trade[] = [];
  let remaining = qty;

  while (remaining > 0) {
    const top = book.peekTop(opposite);
    if (!top) break;
    const { level, price } = top;

    while (remaining > 0 && !level.isEmpty) {
      const head = level.peek()!;
      const fillQty = Math.min(remaining, head.qty);

      trades.push({
        id: ctx.nextTradeId(),
        price: head.price,
        qty: fillQty,
        buyOrderId: side === "buy" ? takerOrderId : head.id,
        sellOrderId: side === "sell" ? takerOrderId : head.id,
        aggressorSide: side,
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

  return { trades, filled: qty - remaining, unfilled: remaining };
}
