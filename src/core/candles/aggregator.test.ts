import { describe, it, expect } from "vitest";
import { CandleAggregator } from "./aggregator";
import { bucketStart, TIMEFRAME_MS } from "./timeframes";
import type { Trade } from "../types";

const trade = (price: number, qty: number, timestamp: number): Trade => ({
  id: `t${timestamp}`,
  price,
  qty,
  buyOrderId: "b",
  sellOrderId: "s",
  aggressorSide: "buy",
  timestamp,
});

describe("bucketStart", () => {
  it("aligns to the timeframe boundary", () => {
    expect(bucketStart(0, "1s")).toBe(0);
    expect(bucketStart(999, "1s")).toBe(0);
    expect(bucketStart(1000, "1s")).toBe(1000);
    expect(bucketStart(1234, "1s")).toBe(1000);
    expect(bucketStart(123_456, "1m")).toBe(120_000);
  });

  it("matches TIMEFRAME_MS values", () => {
    expect(TIMEFRAME_MS["1m"]).toBe(60_000);
    expect(TIMEFRAME_MS["1h"]).toBe(3_600_000);
  });
});

describe("CandleAggregator", () => {
  it("builds a candle from a single trade", () => {
    const agg = new CandleAggregator("1s");
    const { closed, current } = agg.onTrade(trade(100, 2, 500));
    expect(closed).toBeNull();
    expect(current).toEqual({
      timeframe: "1s",
      timestamp: 0,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 2,
      trades: 1,
    });
  });

  it("aggregates multiple trades inside the same bucket", () => {
    const agg = new CandleAggregator("1s");
    agg.onTrade(trade(100, 1, 100));
    agg.onTrade(trade(102, 2, 200));
    agg.onTrade(trade(98, 1, 800));
    const { closed, current } = agg.onTrade(trade(101, 3, 900));
    expect(closed).toBeNull();
    expect(current).toEqual({
      timeframe: "1s",
      timestamp: 0,
      open: 100,
      high: 102,
      low: 98,
      close: 101,
      volume: 7,
      trades: 4,
    });
  });

  it("rolls over to a new candle when the bucket changes", () => {
    const agg = new CandleAggregator("1s");
    agg.onTrade(trade(100, 1, 500));
    const { closed, current } = agg.onTrade(trade(101, 2, 1500));
    expect(closed).toEqual(expect.objectContaining({ timestamp: 0, close: 100, volume: 1 }));
    expect(current).toEqual(expect.objectContaining({ timestamp: 1000, open: 101, close: 101 }));
    expect(agg.history()).toHaveLength(1);
  });

  it("closeCurrent flushes the open candle", () => {
    const agg = new CandleAggregator("1s");
    agg.onTrade(trade(100, 1, 500));
    const c = agg.closeCurrent();
    expect(c).toEqual(expect.objectContaining({ open: 100 }));
    expect(agg.open()).toBeNull();
    expect(agg.history()).toHaveLength(1);
  });
});
