import { describe, it, expect } from "vitest";
import { normalizeBitstampBook, normalizeBitstampTrade } from "./bitstamp.normalize";

describe("normalizeBitstampBook", () => {
  it("parses string prices/qtys and microtimestamp to ms", () => {
    const e = normalizeBitstampBook(
      {
        timestamp: "1700000000",
        microtimestamp: "1700000000123000",
        bids: [["50000.00", "0.5"]],
        asks: [["50001.00", "0.3"]],
      },
      "btcusd",
    );
    expect(e.bids).toEqual([{ price: 50000, qty: 0.5 }]);
    expect(e.asks).toEqual([{ price: 50001, qty: 0.3 }]);
    expect(e.timestamp).toBe(1_700_000_000_123);
    expect(e.symbol).toBe("btcusd");
  });
});

describe("normalizeBitstampTrade", () => {
  it("maps type=0 to buy aggressor and type=1 to sell aggressor", () => {
    const a = normalizeBitstampTrade(
      {
        id: 1,
        timestamp: "1700000000",
        amount: "0.25",
        price: "50000",
        type: 0,
        microtimestamp: "1700000000000000",
      },
      "btcusd",
    );
    const b = normalizeBitstampTrade(
      {
        id: 2,
        timestamp: "1700000000",
        amount: 0.1,
        price: 50001,
        type: 1,
        microtimestamp: "1700000000000000",
      },
      "btcusd",
    );
    expect(a.side).toBe("buy");
    expect(b.side).toBe("sell");
  });
});
