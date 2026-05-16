import { describe, it, expect } from "vitest";
import { applyFill, EMPTY_POSITION, unrealizedPnl, totalPnl } from "./position";

const flat = EMPTY_POSITION;

describe("applyFill", () => {
  it("opens a long position from flat", () => {
    const p = applyFill(flat, { side: "buy", price: 100, qty: 5 });
    expect(p.netQty).toBe(5);
    expect(p.avgEntryPrice).toBe(100);
    expect(p.realizedPnl).toBe(0);
    expect(p.tradeCount).toBe(1);
  });

  it("opens a short position from flat", () => {
    const p = applyFill(flat, { side: "sell", price: 100, qty: 5 });
    expect(p.netQty).toBe(-5);
    expect(p.avgEntryPrice).toBe(100);
  });

  it("averages the entry when adding to a long", () => {
    let p = applyFill(flat, { side: "buy", price: 100, qty: 10 });
    p = applyFill(p, { side: "buy", price: 110, qty: 10 });
    expect(p.netQty).toBe(20);
    expect(p.avgEntryPrice).toBe(105);
  });

  it("realizes PnL when reducing a long", () => {
    let p = applyFill(flat, { side: "buy", price: 100, qty: 10 });
    p = applyFill(p, { side: "sell", price: 110, qty: 4 });
    expect(p.netQty).toBe(6);
    expect(p.avgEntryPrice).toBe(100);
    expect(p.realizedPnl).toBe(40);
  });

  it("realizes PnL on exact close and resets avg", () => {
    let p = applyFill(flat, { side: "buy", price: 100, qty: 5 });
    p = applyFill(p, { side: "sell", price: 102, qty: 5 });
    expect(p.netQty).toBe(0);
    expect(p.avgEntryPrice).toBe(0);
    expect(p.realizedPnl).toBe(10);
  });

  it("flips a long to a short with realized PnL on the closed portion", () => {
    let p = applyFill(flat, { side: "buy", price: 100, qty: 5 });
    p = applyFill(p, { side: "sell", price: 110, qty: 8 });
    expect(p.netQty).toBe(-3);
    expect(p.avgEntryPrice).toBe(110);
    expect(p.realizedPnl).toBe(50);
  });

  it("computes correct PnL on a short → buy close", () => {
    let p = applyFill(flat, { side: "sell", price: 100, qty: 10 });
    p = applyFill(p, { side: "buy", price: 90, qty: 10 });
    expect(p.netQty).toBe(0);
    expect(p.realizedPnl).toBe(100);
  });

  it("accumulates totalBought / totalSold and tradeCount", () => {
    let p = flat;
    p = applyFill(p, { side: "buy", price: 100, qty: 3 });
    p = applyFill(p, { side: "buy", price: 101, qty: 2 });
    p = applyFill(p, { side: "sell", price: 105, qty: 4 });
    expect(p.totalBought).toBe(5);
    expect(p.totalSold).toBe(4);
    expect(p.tradeCount).toBe(3);
  });

  it("ignores zero-qty fills", () => {
    const p = applyFill(flat, { side: "buy", price: 100, qty: 0 });
    expect(p).toBe(flat);
  });
});

describe("unrealizedPnl / totalPnl", () => {
  it("returns 0 when flat", () => {
    expect(unrealizedPnl(flat, 100)).toBe(0);
    expect(totalPnl(flat, 100)).toBe(0);
  });

  it("positive when long and price > avg", () => {
    const p = applyFill(flat, { side: "buy", price: 100, qty: 5 });
    expect(unrealizedPnl(p, 110)).toBe(50);
  });

  it("positive when short and price < avg", () => {
    const p = applyFill(flat, { side: "sell", price: 100, qty: 5 });
    expect(unrealizedPnl(p, 90)).toBe(50);
  });

  it("totalPnl combines realized + unrealized", () => {
    let p = applyFill(flat, { side: "buy", price: 100, qty: 10 });
    p = applyFill(p, { side: "sell", price: 110, qty: 4 }); // realized 40, net 6 long @ 100
    expect(totalPnl(p, 105)).toBe(40 + 30);
  });
});
