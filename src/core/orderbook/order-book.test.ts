import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "./order-book";
import { makeOrder } from "../types";
import { nextOrderId, resetIds } from "../ids";

const limit = (side: "buy" | "sell", price: number, qty: number, ts = 0) =>
  makeOrder({ id: nextOrderId(), side, type: "limit", price, qty, ownerId: "test", timestamp: ts });

describe("OrderBook", () => {
  beforeEach(() => resetIds());

  it("adds a limit order and surfaces it in the snapshot", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("buy", 100, 5));
    const snap = book.snapshot(5, 0);
    expect(snap.bids).toEqual([{ price: 100, qty: 5, orderCount: 1 }]);
    expect(snap.asks).toEqual([]);
  });

  it("aggregates qty at the same price level (FIFO within level)", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("buy", 100, 5));
    book.addLimit(limit("buy", 100, 3));
    const lvl = book.getLevel("buy", 100)!;
    expect(lvl.totalQty).toBe(8);
    expect(lvl.orderCount).toBe(2);
    expect(lvl.orders()[0]!.id).toBe("o1");
    expect(lvl.orders()[1]!.id).toBe("o2");
  });

  it("orders bids descending and asks ascending", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("buy", 99, 1));
    book.addLimit(limit("buy", 101, 1));
    book.addLimit(limit("buy", 100, 1));
    book.addLimit(limit("sell", 105, 1));
    book.addLimit(limit("sell", 103, 1));
    book.addLimit(limit("sell", 104, 1));
    const snap = book.snapshot(5, 0);
    expect(snap.bids.map((l) => l.price)).toEqual([101, 100, 99]);
    expect(snap.asks.map((l) => l.price)).toEqual([103, 104, 105]);
  });

  it("computes best bid/ask, spread and mid", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("buy", 100, 1));
    book.addLimit(limit("sell", 102, 1));
    expect(book.bestBid()).toBe(100);
    expect(book.bestAsk()).toBe(102);
    expect(book.spread()).toBe(2);
    expect(book.midPrice()).toBe(101);
  });

  it("cancels a resting order and drops empty levels", () => {
    const book = new OrderBook("FAKE");
    const o = limit("buy", 100, 5);
    book.addLimit(o);
    expect(book.cancel(o.id)).toBe(true);
    expect(book.bestBid()).toBeUndefined();
    expect(book.getLevel("buy", 100)).toBeUndefined();
    expect(book.cancel(o.id)).toBe(false);
  });

  it("respects snapshot depth", () => {
    const book = new OrderBook("FAKE");
    for (let p = 90; p <= 100; p++) book.addLimit(limit("buy", p, 1));
    const snap = book.snapshot(3, 0);
    expect(snap.bids.map((l) => l.price)).toEqual([100, 99, 98]);
  });

  it("rejects non-limit, non-positive qty, and duplicate ids", () => {
    const book = new OrderBook("FAKE");
    expect(() =>
      book.addLimit({ ...limit("buy", 100, 5), type: "market" }),
    ).toThrow(/not a limit/);
    expect(() => book.addLimit(limit("buy", 100, 0))).toThrow(/non-positive/);
    const o = limit("buy", 100, 1);
    book.addLimit(o);
    expect(() => book.addLimit(o)).toThrow(/duplicate/);
  });
});
