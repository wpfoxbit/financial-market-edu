import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "../orderbook";
import { resetIds } from "../ids";
import { ScenarioPlayer } from "./scenario-player";
import type { Scenario } from "./scenario";
import { seedBook } from "./seed-book";
import { RNG } from "../utils/rng";

const SCENARIO: Scenario = {
  id: "test",
  name: "Test",
  description: "",
  seed: 99,
  symbol: { id: "F", base: "F", quote: "U", tickSize: 0.5, qtyStep: 0.01 },
  timeframe: "1s",
  initialMidPrice: 100,
  seedSpread: 1,
  seedLevels: 5,
  seedQtyPerLevel: 1,
  generators: [
    {
      kind: "liquidity",
      id: "liq",
      params: {
        referencePrice: 100,
        targetSpread: 1,
        targetLevels: 4,
        qtyMean: 1.5,
        qtyStdev: 0.3,
        refreshChance: 0.6,
        tickSize: 0.5,
        qtyStep: 0.01,
      },
    },
    {
      kind: "aggression",
      id: "agg",
      params: {
        lambda: 0.3,
        sizeMean: 0.8,
        sizeStdev: 0.2,
        sideBias: 0.5,
        qtyStep: 0.01,
      },
    },
  ],
};

function runPlayer(scenario: Scenario, ticks: number) {
  resetIds();
  const book = new OrderBook(scenario.symbol.id);
  seedBook(book, {
    mid: scenario.initialMidPrice,
    spread: scenario.seedSpread,
    levels: scenario.seedLevels,
    qtyPerLevel: scenario.seedQtyPerLevel,
    tickSize: scenario.symbol.tickSize,
    qtyStep: scenario.symbol.qtyStep,
    rng: new RNG(scenario.seed),
  });
  const player = new ScenarioPlayer(scenario);
  let tradeCount = 0;
  let lastSnap = book.snapshot(20, 0);
  let nextTradeCounter = 0;
  let nextOrderCounter = 100_000;
  for (let i = 0; i < ticks; i++) {
    const { trades } = player.feeder(book, {
      nextOrderId: () => `o-${++nextOrderCounter}`,
      nextTradeId: () => `t-${++nextTradeCounter}`,
      timestamp: i * 100,
      tickIndex: i + 1,
    });
    tradeCount += trades.length;
    lastSnap = book.snapshot(20, i * 100);
  }
  return { tradeCount, lastSnap };
}

describe("ScenarioPlayer", () => {
  beforeEach(() => resetIds());

  it("is deterministic across runs with the same scenario", () => {
    const a = runPlayer(SCENARIO, 50);
    const b = runPlayer(SCENARIO, 50);
    expect(a.tradeCount).toBe(b.tradeCount);
    expect(JSON.stringify(a.lastSnap)).toBe(JSON.stringify(b.lastSnap));
  });

  it("a different seed yields a different history", () => {
    const a = runPlayer(SCENARIO, 80);
    const b = runPlayer({ ...SCENARIO, seed: SCENARIO.seed + 1 }, 80);
    expect(JSON.stringify(a.lastSnap)).not.toBe(JSON.stringify(b.lastSnap));
  });

  it("a scenario with no generators leaves the book unchanged", () => {
    const empty: Scenario = { ...SCENARIO, generators: [] };
    const before = runPlayer(empty, 0);
    const after = runPlayer(empty, 20);
    expect(after.tradeCount).toBe(0);
    expect(JSON.stringify(after.lastSnap.bids)).toBe(JSON.stringify(before.lastSnap.bids));
    expect(JSON.stringify(after.lastSnap.asks)).toBe(JSON.stringify(before.lastSnap.asks));
  });
});
