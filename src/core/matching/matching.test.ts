import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "../orderbook";
import { matchMarket } from "./match-market";
import { submitLimit } from "./match-limit";
import { makeOrder, type Side } from "../types";
import { nextOrderId, nextTradeId, resetIds } from "../ids";

const limit = (side: Side, price: number, qty: number) =>
  makeOrder({ id: nextOrderId(), side, type: "limit", price, qty, ownerId: "test", timestamp: 0 });

const ctx = () => ({ nextTradeId, timestamp: 1000 });

describe("matchMarket", () => {
  beforeEach(() => resetIds());

  it("walks a single level and fills fully", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 100, 10));
    const r = matchMarket(book, "buy", 4, "taker", ctx());
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]).toMatchObject({ price: 100, qty: 4, aggressorSide: "buy" });
    expect(r.filled).toBe(4);
    expect(r.unfilled).toBe(0);
    // 6 remaining on the level
    expect(book.getLevel("sell", 100)!.totalQty).toBe(6);
  });

  it("walks multiple price levels for a large aggression", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 100, 2));
    book.addLimit(limit("sell", 101, 3));
    book.addLimit(limit("sell", 102, 10));
    const r = matchMarket(book, "buy", 8, "taker", ctx());
    expect(r.trades.map((t) => [t.price, t.qty])).toEqual([
      [100, 2],
      [101, 3],
      [102, 3],
    ]);
    expect(r.filled).toBe(8);
    expect(book.bestAsk()).toBe(102);
    expect(book.getLevel("sell", 102)!.totalQty).toBe(7);
  });

  it("returns unfilled when liquidity is insufficient", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 100, 3));
    const r = matchMarket(book, "buy", 10, "taker", ctx());
    expect(r.filled).toBe(3);
    expect(r.unfilled).toBe(7);
    expect(book.bestAsk()).toBeUndefined();
  });

  it("preserves FIFO order within a level", () => {
    const book = new OrderBook("FAKE");
    const o1 = limit("sell", 100, 2);
    const o2 = limit("sell", 100, 5);
    book.addLimit(o1);
    book.addLimit(o2);
    const r = matchMarket(book, "buy", 3, "taker", ctx());
    expect(r.trades).toEqual([
      expect.objectContaining({ price: 100, qty: 2, sellOrderId: o1.id }),
      expect.objectContaining({ price: 100, qty: 1, sellOrderId: o2.id }),
    ]);
    expect(o1.status).toBe("filled");
    expect(o2.status).toBe("partial");
    expect(o2.qty).toBe(4);
  });
});

describe("submitLimit", () => {
  beforeEach(() => resetIds());

  it("rests on the book when it does not cross", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 102, 1));
    const incoming = limit("buy", 100, 5);
    const r = submitLimit(book, incoming, ctx());
    expect(r.trades).toEqual([]);
    expect(r.resting).toBe(incoming);
    expect(book.bestBid()).toBe(100);
  });

  it("crosses and matches, then rests the remainder", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 100, 3));
    const incoming = limit("buy", 100, 8);
    const r = submitLimit(book, incoming, ctx());
    expect(r.trades).toEqual([
      expect.objectContaining({ price: 100, qty: 3, aggressorSide: "buy" }),
    ]);
    expect(r.resting).toBe(incoming);
    expect(incoming.qty).toBe(5);
    expect(incoming.status).toBe("partial");
    expect(book.bestBid()).toBe(100);
    expect(book.bestAsk()).toBeUndefined();
  });

  it("crosses and fully matches without resting", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 100, 10));
    const incoming = limit("buy", 100, 4);
    const r = submitLimit(book, incoming, ctx());
    expect(r.resting).toBe(null);
    expect(incoming.status).toBe("filled");
    expect(book.getLevel("sell", 100)!.totalQty).toBe(6);
  });

  it("buy limit only matches asks at or below its price", () => {
    const book = new OrderBook("FAKE");
    book.addLimit(limit("sell", 100, 2));
    book.addLimit(limit("sell", 101, 5));
    const incoming = limit("buy", 100, 10);
    const r = submitLimit(book, incoming, ctx());
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]!.price).toBe(100);
    expect(book.bestBid()).toBe(100);
    expect(book.bestAsk()).toBe(101);
  });
});
