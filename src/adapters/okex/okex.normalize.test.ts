import { describe, it, expect } from "vitest";
import { normalizeOkxBook, normalizeOkxTrade } from "./okex.normalize";

describe("normalizeOkxBook", () => {
  it("parses books5 entries to numbers and preserves order", () => {
    const e = normalizeOkxBook(
      {
        instId: "BTC-USDT",
        asks: [
          ["50001", "0.3", "0", "1"],
          ["50002", "0.5", "0", "2"],
        ],
        bids: [
          ["50000", "1.2", "0", "3"],
          ["49999", "0.8", "0", "1"],
        ],
        ts: "1700000000000",
      },
      "BTC-USDT",
    );
    expect(e.symbol).toBe("btc-usdt");
    expect(e.bids[0]).toEqual({ price: 50000, qty: 1.2 });
    expect(e.asks[1]).toEqual({ price: 50002, qty: 0.5 });
    expect(e.timestamp).toBe(1_700_000_000_000);
  });
});

describe("normalizeOkxTrade", () => {
  it("uses side directly (already taker convention)", () => {
    const e = normalizeOkxTrade({
      instId: "BTC-USDT",
      tradeId: "abc123",
      px: "50000.5",
      sz: "0.1",
      side: "buy",
      ts: "1700000000001",
    });
    expect(e.symbol).toBe("btc-usdt");
    expect(e.side).toBe("buy");
    expect(e.qty).toBe(0.1);
    expect(e.timestamp).toBe(1_700_000_000_001);
  });
});
