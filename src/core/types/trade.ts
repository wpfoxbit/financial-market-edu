import type { OrderId, Side } from "./order";

export interface Trade {
  id: string;
  price: number;
  qty: number;
  buyOrderId: OrderId;
  sellOrderId: OrderId;
  aggressorSide: Side;
  timestamp: number;
}
