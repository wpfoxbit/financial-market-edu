import type { Side } from "../types";

export interface Position {
  /** Net position in base units. Positive = long, negative = short. */
  netQty: number;
  /** Volume-weighted average entry price. Zero when flat. */
  avgEntryPrice: number;
  /** Realized PnL accumulated over all closed/reduced portions. */
  realizedPnl: number;
  /** Lifetime totals — useful for execution stats. */
  totalBought: number;
  totalSold: number;
  tradeCount: number;
}

export const EMPTY_POSITION: Position = {
  netQty: 0,
  avgEntryPrice: 0,
  realizedPnl: 0,
  totalBought: 0,
  totalSold: 0,
  tradeCount: 0,
};

export interface Fill {
  side: Side;
  price: number;
  qty: number;
}

/**
 * Apply a fill to a position. Pure function — returns a new Position.
 *
 * Cases:
 *  - same direction (or opening from zero): weighted-average entry
 *  - opposite direction, partial reduce: realized PnL on closed portion, avg unchanged
 *  - opposite direction, exact close: avg → 0
 *  - opposite direction, flip: realized PnL on closed portion, avg = fill.price for the new side
 */
export function applyFill(pos: Position, fill: Fill): Position {
  if (fill.qty <= 0) return pos;

  const tradeNet = fill.side === "buy" ? fill.qty : -fill.qty;
  const newNet = pos.netQty + tradeNet;
  const sameDirection =
    pos.netQty === 0 || Math.sign(pos.netQty) === Math.sign(tradeNet);

  let newAvg = pos.avgEntryPrice;
  let realized = pos.realizedPnl;

  if (sameDirection) {
    const absOld = Math.abs(pos.netQty);
    const absNew = Math.abs(newNet);
    newAvg = absNew > 0 ? (pos.avgEntryPrice * absOld + fill.price * fill.qty) / absNew : 0;
  } else {
    const closeQty = Math.min(Math.abs(pos.netQty), fill.qty);
    const longDirection = pos.netQty > 0 ? 1 : -1;
    realized += longDirection * (fill.price - pos.avgEntryPrice) * closeQty;

    if (Math.abs(tradeNet) > Math.abs(pos.netQty)) {
      newAvg = fill.price;
    } else if (newNet === 0) {
      newAvg = 0;
    }
  }

  return {
    netQty: round(newNet),
    avgEntryPrice: newAvg,
    realizedPnl: realized,
    totalBought: fill.side === "buy" ? pos.totalBought + fill.qty : pos.totalBought,
    totalSold: fill.side === "sell" ? pos.totalSold + fill.qty : pos.totalSold,
    tradeCount: pos.tradeCount + 1,
  };
}

/**
 * Mark-to-market PnL using the current reference price (typically mid).
 * Returns 0 when flat.
 */
export function unrealizedPnl(pos: Position, referencePrice: number): number {
  if (pos.netQty === 0) return 0;
  return (referencePrice - pos.avgEntryPrice) * pos.netQty;
}

export function totalPnl(pos: Position, referencePrice: number): number {
  return pos.realizedPnl + unrealizedPnl(pos, referencePrice);
}

/** Smooth out floating-point drift near zero. */
function round(v: number): number {
  return Math.abs(v) < 1e-9 ? 0 : v;
}
