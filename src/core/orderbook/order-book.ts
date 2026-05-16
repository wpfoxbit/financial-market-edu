import type { BookSnapshot, Level, Order, OrderId, Side } from "../types";
import { PriceLevel } from "./price-level";

interface OrderIndexEntry {
  side: Side;
  price: number;
}

export class OrderBook {
  readonly symbol: string;
  private readonly bidLevels = new Map<number, PriceLevel>();
  private readonly askLevels = new Map<number, PriceLevel>();
  private readonly bidPrices: number[] = [];
  private readonly askPrices: number[] = [];
  private readonly index = new Map<OrderId, OrderIndexEntry>();

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  addLimit(order: Order): void {
    if (order.type !== "limit") {
      throw new Error(`OrderBook.addLimit: order ${order.id} is not a limit order`);
    }
    if (order.qty <= 0) {
      throw new Error(`OrderBook.addLimit: order ${order.id} has non-positive qty`);
    }
    if (this.index.has(order.id)) {
      throw new Error(`OrderBook.addLimit: duplicate order id ${order.id}`);
    }

    const levels = order.side === "buy" ? this.bidLevels : this.askLevels;
    const prices = order.side === "buy" ? this.bidPrices : this.askPrices;

    let level = levels.get(order.price);
    if (!level) {
      level = new PriceLevel(order.price);
      levels.set(order.price, level);
      this.insertPrice(prices, order.price, order.side);
    }
    level.add(order);
    this.index.set(order.id, { side: order.side, price: order.price });
  }

  cancel(orderId: OrderId): boolean {
    const entry = this.index.get(orderId);
    if (!entry) return false;
    const levels = entry.side === "buy" ? this.bidLevels : this.askLevels;
    const prices = entry.side === "buy" ? this.bidPrices : this.askPrices;
    const level = levels.get(entry.price);
    if (!level) {
      this.index.delete(orderId);
      return false;
    }
    const removed = level.remove(orderId);
    if (level.isEmpty) {
      levels.delete(entry.price);
      this.removePrice(prices, entry.price);
    }
    this.index.delete(orderId);
    return removed;
  }

  bestBid(): number | undefined {
    return this.bidPrices[0];
  }

  bestAsk(): number | undefined {
    return this.askPrices[0];
  }

  spread(): number | undefined {
    const b = this.bestBid();
    const a = this.bestAsk();
    return b !== undefined && a !== undefined ? a - b : undefined;
  }

  midPrice(): number | undefined {
    const b = this.bestBid();
    const a = this.bestAsk();
    return b !== undefined && a !== undefined ? (a + b) / 2 : undefined;
  }

  getLevel(side: Side, price: number): PriceLevel | undefined {
    return (side === "buy" ? this.bidLevels : this.askLevels).get(price);
  }

  totalQtyAt(side: Side, price: number): number {
    return this.getLevel(side, price)?.totalQty ?? 0;
  }

  totalQtyOnSide(side: Side): number {
    const levels = side === "buy" ? this.bidLevels : this.askLevels;
    let sum = 0;
    for (const lv of levels.values()) sum += lv.totalQty;
    return sum;
  }

  clear(): void {
    this.bidLevels.clear();
    this.askLevels.clear();
    this.bidPrices.length = 0;
    this.askPrices.length = 0;
    this.index.clear();
  }

  peekTop(side: Side): { price: number; level: PriceLevel } | undefined {
    const prices = side === "buy" ? this.bidPrices : this.askPrices;
    const levels = side === "buy" ? this.bidLevels : this.askLevels;
    const price = prices[0];
    if (price === undefined) return undefined;
    const level = levels.get(price);
    return level ? { price, level } : undefined;
  }

  dropLevel(side: Side, price: number): void {
    const levels = side === "buy" ? this.bidLevels : this.askLevels;
    const prices = side === "buy" ? this.bidPrices : this.askPrices;
    levels.delete(price);
    this.removePrice(prices, price);
  }

  forgetOrder(orderId: OrderId): void {
    this.index.delete(orderId);
  }

  hasOrder(orderId: OrderId): boolean {
    return this.index.has(orderId);
  }

  snapshot(depth: number, timestamp: number): BookSnapshot {
    const collect = (prices: number[], levels: Map<number, PriceLevel>): Level[] => {
      const out: Level[] = [];
      const limit = Math.min(depth, prices.length);
      for (let i = 0; i < limit; i++) {
        const lv = levels.get(prices[i]!)!;
        out.push({ price: lv.price, qty: lv.totalQty, orderCount: lv.orderCount });
      }
      return out;
    };
    return {
      symbol: this.symbol,
      bids: collect(this.bidPrices, this.bidLevels),
      asks: collect(this.askPrices, this.askLevels),
      timestamp,
    };
  }

  private insertPrice(arr: number[], price: number, side: Side): void {
    const compare =
      side === "buy" ? (a: number, b: number) => b - a : (a: number, b: number) => a - b;
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compare(arr[mid]!, price) < 0) lo = mid + 1;
      else hi = mid;
    }
    arr.splice(lo, 0, price);
  }

  private removePrice(arr: number[], price: number): void {
    const idx = arr.indexOf(price);
    if (idx >= 0) arr.splice(idx, 1);
  }
}
