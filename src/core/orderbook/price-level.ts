import type { Order, OrderId } from "../types";

export class PriceLevel {
  readonly price: number;
  private readonly fifo: Order[] = [];

  constructor(price: number) {
    this.price = price;
  }

  get totalQty(): number {
    let sum = 0;
    for (const o of this.fifo) sum += o.qty;
    return sum;
  }

  get orderCount(): number {
    return this.fifo.length;
  }

  get isEmpty(): boolean {
    return this.fifo.length === 0;
  }

  add(order: Order): void {
    this.fifo.push(order);
  }

  remove(orderId: OrderId): boolean {
    const idx = this.fifo.findIndex((o) => o.id === orderId);
    if (idx < 0) return false;
    this.fifo.splice(idx, 1);
    return true;
  }

  peek(): Order | undefined {
    return this.fifo[0];
  }

  shift(): Order | undefined {
    return this.fifo.shift();
  }

  orders(): readonly Order[] {
    return this.fifo;
  }
}
