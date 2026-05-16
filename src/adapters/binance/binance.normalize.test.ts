import { describe, it, expect } from "vitest";
import { normalizeBinanceDepth, normalizeBinanceTrade } from "./binance.normalize";

describe("normalizeBinanceDepth", () => {
  it("converts string prices/qtys to numbers and preserves order", () => {
    const raw = {
      lastUpdateId: 1234,
      bids: [
        ["50000.10", "0.5"],
        ["50000.00", "1.2"],
      ] as [string, string][],
      asks: [
        ["50000.50", "0.3"],
        ["50001.00", "0.8"],
      ] as [string, string][],
    };
    const e = normalizeBinanceDepth(raw, "btcusdt", 1_000_000);
    expect(e.symbol).toBe("btcusdt");
    expect(e.bids).toEqual([
      { price: 50000.1, qty: 0.5 },
      { price: 50000, qty: 1.2 },
    ]);
    expect(e.asks[0]).toEqual({ price: 50000.5, qty: 0.3 });
    expect(e.timestamp).toBe(1_000_000);
  });
});

describe("normalizeBinanceTrade", () => {
  it("maps m=true to sell aggressor (taker)", () => {
    const e = normalizeBinanceTrade({
      e: "trade",
      E: 1_000,
      s: "BTCUSDT",
      t: 7,
      p: "50000.5",
      q: "0.25",
      T: 1_001,
      m: true,
    });
    expect(e.id).toBe("7");
    expect(e.symbol).toBe("btcusdt");
    expect(e.price).toBe(50000.5);
    expect(e.qty).toBe(0.25);
    expect(e.side).toBe("sell");
    expect(e.timestamp).toBe(1_001);
  });

  it("maps m=false to buy aggressor (taker)", () => {
    const e = normalizeBinanceTrade({
      e: "trade",
      E: 1_000,
      s: "ETHUSDT",
      t: 8,
      p: "2500.0",
      q: "1",
      T: 1_001,
      m: false,
    });
    expect(e.side).toBe("buy");
  });
});
