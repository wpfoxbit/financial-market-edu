export type Side = "buy" | "sell";

export type OrderType = "limit" | "market";

export type OrderStatus = "open" | "partial" | "filled" | "canceled";

export type OrderId = string;

export interface Order {
  id: OrderId;
  side: Side;
  type: OrderType;
  price: number;
  qty: number;
  originalQty: number;
  ownerId: string;
  timestamp: number;
  status: OrderStatus;
}

export function makeOrder(input: {
  id: OrderId;
  side: Side;
  type: OrderType;
  price: number;
  qty: number;
  ownerId: string;
  timestamp: number;
}): Order {
  return {
    id: input.id,
    side: input.side,
    type: input.type,
    price: input.price,
    qty: input.qty,
    originalQty: input.qty,
    ownerId: input.ownerId,
    timestamp: input.timestamp,
    status: "open",
  };
}
