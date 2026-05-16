let orderCounter = 0;
let tradeCounter = 0;

export function nextOrderId(): string {
  return `o${++orderCounter}`;
}

export function nextTradeId(): string {
  return `t${++tradeCounter}`;
}

export function resetIds(): void {
  orderCounter = 0;
  tradeCounter = 0;
}
