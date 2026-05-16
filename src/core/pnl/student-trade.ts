import type { OrderId, OrderType, Side } from "../types";

export interface StudentTrade {
  id: string;
  orderId: OrderId;
  side: Side;
  price: number;
  qty: number;
  timestamp: number;
  orderType: OrderType;
  /** Reference price at the moment the order was submitted (best opposite for market orders). */
  refPrice?: number;
  /** Signed slippage. Positive = paid more / received less than reference. Zero for limit fills. */
  slippage: number;
}

export function avgSlippage(trades: readonly StudentTrade[]): number {
  const markets = trades.filter((t) => t.orderType === "market");
  if (markets.length === 0) return 0;
  const sum = markets.reduce((acc, t) => acc + t.slippage, 0);
  return sum / markets.length;
}
