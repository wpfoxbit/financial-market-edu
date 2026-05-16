import { describe, it, expect, beforeEach } from "vitest";
import { SandboxEngine } from "@core/sandbox/sandbox-engine";
import { createAccount, resetAccountIds } from "@core/sandbox/account";
import { seedSandboxBook } from "@core/sandbox/book-initializer";
import { generateBulkOrders } from "@core/sandbox/bulk-order";
import { nextOrderId, resetIds } from "@core/ids";
import type { Symbol } from "@core/types";

const SYMBOL: Symbol = {
  id: "TEST/USD",
  base: "TEST",
  quote: "USD",
  tickSize: 0.5,
  qtyStep: 0.01,
};

describe("SandboxEngine", () => {
  let engine: SandboxEngine;

  beforeEach(() => {
    resetIds();
    resetAccountIds();
    engine = new SandboxEngine({ symbol: SYMBOL, timeframe: "1s", depth: 10 });
    seedSandboxBook(engine.book, {
      midPrice: 100,
      spread: 1,
      levels: 10,
      defaultQty: 5,
      customVolumes: new Map(),
      tickSize: 0.5,
      qtyStep: 0.01,
      nextOrderId,
    });
  });

  it("should add and retrieve accounts", () => {
    const acc = createAccount("Alice", "manual");
    engine.addAccount(acc);
    expect(engine.getAccount(acc.id)).toBe(acc);
    expect(engine.getAccounts().size).toBe(1);
  });

  it("should submit limit order for an account", () => {
    const acc = createAccount("Alice", "manual");
    engine.addAccount(acc);
    const result = engine.submitOrder(acc.id, { side: "buy", type: "limit", price: 95, qty: 1 });
    expect(result).not.toBeNull();
    expect(result!.order.ownerId).toBe(acc.id);
    expect(acc.openOrderIds.size).toBe(1);
  });

  it("should submit market order and update position", () => {
    const acc = createAccount("Alice", "manual");
    engine.addAccount(acc);
    const result = engine.submitOrder(acc.id, { side: "buy", type: "market", price: 0, qty: 1 });
    expect(result).not.toBeNull();
    expect(result!.trades.length).toBeGreaterThan(0);
    expect(acc.position.netQty).toBeGreaterThan(0);
  });

  it("should cancel an order", () => {
    const acc = createAccount("Bob", "manual");
    engine.addAccount(acc);
    const result = engine.submitOrder(acc.id, { side: "sell", type: "limit", price: 110, qty: 2 });
    expect(result).not.toBeNull();
    expect(acc.openOrderIds.size).toBe(1);
    engine.cancelOrder(acc.id, result!.order.id);
    expect(acc.openOrderIds.size).toBe(0);
  });

  it("should cancel all orders for an account", () => {
    const acc = createAccount("Charlie", "manual");
    engine.addAccount(acc);
    engine.submitOrder(acc.id, { side: "sell", type: "limit", price: 110, qty: 1 });
    engine.submitOrder(acc.id, { side: "sell", type: "limit", price: 111, qty: 1 });
    expect(acc.openOrderIds.size).toBe(2);
    engine.cancelAllOrders(acc.id);
    expect(acc.openOrderIds.size).toBe(0);
  });

  it("should route trades to correct accounts on cross", () => {
    // Create a fresh engine with no seed book so only our accounts' orders exist.
    resetIds();
    resetAccountIds();
    const fresh = new SandboxEngine({ symbol: SYMBOL, timeframe: "1s", depth: 10 });

    const buyer = createAccount("Buyer", "manual");
    const seller = createAccount("Seller", "manual");
    fresh.addAccount(buyer);
    fresh.addAccount(seller);

    // Seller places limit ask
    fresh.submitOrder(seller.id, { side: "sell", type: "limit", price: 100, qty: 2 });
    // Buyer aggresses with market buy
    fresh.submitOrder(buyer.id, { side: "buy", type: "market", price: 0, qty: 1 });

    expect(buyer.position.netQty).toBe(1);
    expect(seller.position.totalSold).toBe(1);
  });

  it("should remove account and cancel its orders", () => {
    const acc = createAccount("Temp", "manual");
    engine.addAccount(acc);
    engine.submitOrder(acc.id, { side: "buy", type: "limit", price: 90, qty: 1 });
    expect(engine.getAccounts().size).toBe(1);
    engine.removeAccount(acc.id);
    expect(engine.getAccounts().size).toBe(0);
  });
});

describe("generateBulkOrders", () => {
  beforeEach(() => resetIds());

  it("should generate N orders across price range", () => {
    const orders = generateBulkOrders({
      side: "sell",
      startPrice: 100,
      endPrice: 110,
      count: 6,
      qtyPerOrder: 1,
      tickSize: 0.5,
      qtyStep: 0.01,
      ownerId: "acc-1",
      nextOrderId,
      timestamp: 0,
    });
    expect(orders.length).toBe(6);
    expect(orders[0]!.price).toBe(100);
    expect(orders[5]!.price).toBe(110);
    expect(orders.every((o) => o.side === "sell")).toBe(true);
    expect(orders.every((o) => o.ownerId === "acc-1")).toBe(true);
  });

  it("should handle count = 1", () => {
    const orders = generateBulkOrders({
      side: "buy",
      startPrice: 50,
      endPrice: 60,
      count: 1,
      qtyPerOrder: 2,
      tickSize: 1,
      qtyStep: 1,
      ownerId: "acc-2",
      nextOrderId,
      timestamp: 0,
    });
    expect(orders.length).toBe(1);
    expect(orders[0]!.price).toBe(50);
  });
});

describe("seedSandboxBook", () => {
  beforeEach(() => resetIds());

  it("should seed book with uniform levels", () => {
    const engine = new SandboxEngine({ symbol: SYMBOL, timeframe: "1s" });
    seedSandboxBook(engine.book, {
      midPrice: 100,
      spread: 1,
      levels: 10,
      defaultQty: 2,
      customVolumes: new Map(),
      tickSize: 0.5,
      qtyStep: 0.01,
      nextOrderId,
    });
    const snap = engine.book.snapshot(10, 0);
    expect(snap.bids.length).toBe(5);
    expect(snap.asks.length).toBe(5);
  });

  it("should respect custom volume overrides", () => {
    const engine = new SandboxEngine({ symbol: SYMBOL, timeframe: "1s" });
    const custom = new Map([[100.5, 10]]);
    seedSandboxBook(engine.book, {
      midPrice: 100,
      spread: 1,
      levels: 10,
      defaultQty: 2,
      customVolumes: custom,
      tickSize: 0.5,
      qtyStep: 0.01,
      nextOrderId,
    });
    const snap = engine.book.snapshot(10, 0);
    const askAt100_5 = snap.asks.find((l) => l.price === 100.5);
    expect(askAt100_5).toBeDefined();
    expect(askAt100_5!.qty).toBe(10);
  });
});
