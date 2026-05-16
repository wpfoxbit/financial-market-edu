import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "../../orderbook";
import { RNG } from "../../utils/rng";
import { nextOrderId, resetIds } from "../../ids";
import { makeOrder, type Symbol } from "../../types";
import { LiquidityGen } from "./liquidity-gen";
import { AggressionGen } from "./aggression-gen";
import { AbsorptionGen } from "./absorption-gen";
import type { GeneratorContext } from "./types";

const SYMBOL: Symbol = {
  id: "BTC-USD-FAKE",
  base: "BTC",
  quote: "USD",
  tickSize: 0.5,
  qtyStep: 0.01,
};

function makeCtx(book: OrderBook, rng: RNG, tickIndex = 1, timestamp = 1000): GeneratorContext {
  return {
    book,
    rng,
    nextOrderId,
    timestamp,
    tickIndex,
    symbol: SYMBOL,
  };
}

describe("LiquidityGen", () => {
  beforeEach(() => resetIds());

  it("is deterministic given the same RNG seed", () => {
    const gen = () =>
      new LiquidityGen("liq", {
        referencePrice: 50_000,
        targetSpread: 1,
        targetLevels: 5,
        qtyMean: 2,
        qtyStdev: 0.5,
        refreshChance: 1.0,
        tickSize: SYMBOL.tickSize,
        qtyStep: SYMBOL.qtyStep,
      });

    const collect = (seed: number) => {
      resetIds();
      const book = new OrderBook("X");
      const rng = new RNG(seed);
      const g = gen();
      const out = [];
      for (let i = 0; i < 5; i++) out.push(g.tick(makeCtx(book, rng, i + 1)));
      return out;
    };

    const a = collect(42);
    const b = collect(42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("emits a place-limit event on a tick when refreshChance passes", () => {
    const book = new OrderBook("X");
    const rng = new RNG(1);
    const gen = new LiquidityGen("liq", {
      referencePrice: 50_000,
      targetSpread: 2,
      targetLevels: 3,
      qtyMean: 1,
      qtyStdev: 0.1,
      refreshChance: 1.0,
      tickSize: 0.5,
      qtyStep: 0.01,
    });
    const events = gen.tick(makeCtx(book, rng));
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("place-limit");
  });

  it("emits no events when refreshChance is 0", () => {
    const book = new OrderBook("X");
    const rng = new RNG(1);
    const gen = new LiquidityGen("liq", {
      referencePrice: 50_000,
      targetSpread: 2,
      targetLevels: 3,
      qtyMean: 1,
      qtyStdev: 0.1,
      refreshChance: 0,
      tickSize: 0.5,
      qtyStep: 0.01,
    });
    for (let i = 0; i < 10; i++) {
      expect(gen.tick(makeCtx(book, rng, i))).toEqual([]);
    }
  });
});

describe("AggressionGen", () => {
  beforeEach(() => resetIds());

  it("respects sideBias = 1.0 (always buys)", () => {
    const book = new OrderBook("X");
    const rng = new RNG(7);
    const gen = new AggressionGen("agg", {
      lambda: 1.0,
      sizeMean: 1,
      sizeStdev: 0.1,
      sideBias: 1.0,
      qtyStep: 0.01,
    });
    for (let i = 0; i < 20; i++) {
      const events = gen.tick(makeCtx(book, rng, i + 1));
      expect(events).toHaveLength(1);
      const ev = events[0]!;
      if (ev.kind === "market") {
        expect(ev.side).toBe("buy");
      }
    }
  });

  it("respects sideBias = 0.0 (always sells)", () => {
    const book = new OrderBook("X");
    const rng = new RNG(7);
    const gen = new AggressionGen("agg", {
      lambda: 1.0,
      sizeMean: 1,
      sizeStdev: 0.1,
      sideBias: 0.0,
      qtyStep: 0.01,
    });
    for (let i = 0; i < 20; i++) {
      const events = gen.tick(makeCtx(book, rng, i + 1));
      const ev = events[0]!;
      if (ev.kind === "market") {
        expect(ev.side).toBe("sell");
      }
    }
  });

  it("emits no event when lambda is 0", () => {
    const book = new OrderBook("X");
    const rng = new RNG(7);
    const gen = new AggressionGen("agg", {
      lambda: 0,
      sizeMean: 1,
      sizeStdev: 0.1,
      sideBias: 0.5,
      qtyStep: 0.01,
    });
    for (let i = 0; i < 20; i++) {
      expect(gen.tick(makeCtx(book, rng, i + 1))).toEqual([]);
    }
  });
});

describe("AbsorptionGen", () => {
  beforeEach(() => resetIds());

  it("refills when the level is below threshold", () => {
    const book = new OrderBook("X");
    // Seed the defended level with only 3 qty
    const seedRng = new RNG(0);
    const gen = new AbsorptionGen("wall", {
      side: "sell",
      price: 50010,
      refillQty: 25,
      threshold: 15,
      qtyStep: 0.01,
    });
    const events = gen.tick(makeCtx(book, seedRng));
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("place-limit");
    if (events[0]!.kind === "place-limit") {
      expect(events[0]!.order.price).toBe(50010);
      expect(events[0]!.order.side).toBe("sell");
      expect(events[0]!.order.qty).toBe(25);
    }
  });

  it("does NOT refill when at or above threshold", () => {
    const book = new OrderBook("X");
    // Place 20 qty at the level (above threshold of 15)
    book.addLimit(
      makeOrder({
        id: nextOrderId(),
        side: "sell",
        type: "limit",
        price: 50010,
        qty: 20,
        ownerId: "x",
        timestamp: 0,
      }),
    );
    const rng = new RNG(0);
    const gen = new AbsorptionGen("wall", {
      side: "sell",
      price: 50010,
      refillQty: 25,
      threshold: 15,
      qtyStep: 0.01,
    });
    expect(gen.tick(makeCtx(book, rng))).toEqual([]);
  });
});
