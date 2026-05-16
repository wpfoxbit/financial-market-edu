import { describe, it, expect } from "vitest";
import { normalizeFoxbitBook, normalizeFoxbitTrade } from "./foxbit.normalize";

describe("normalizeFoxbitBook", () => {
  it("parses string prices/qtys and lowercases the symbol", () => {
    const e = normalizeFoxbitBook({
      market_symbol: "BTCBRL",
      bids: [{ price: "250000.00", quantity: "0.5" }],
      asks: [{ price: "250100.00", quantity: "0.3" }],
      timestamp: 1_700_000_000_000,
    });
    expect(e.symbol).toBe("btcbrl");
    expect(e.bids).toEqual([{ price: 250_000, qty: 0.5 }]);
    expect(e.asks[0]!.price).toBe(250_100);
    expect(e.timestamp).toBe(1_700_000_000_000);
  });
});

describe("normalizeFoxbitTrade", () => {
  it("parses taker_side directly and accepts ISO timestamps", () => {
    const e = normalizeFoxbitTrade({
      market_symbol: "BTCBRL",
      id: 1,
      price: "250000",
      quantity: "0.1",
      taker_side: "sell",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(e.symbol).toBe("btcbrl");
    expect(e.side).toBe("sell");
    expect(e.qty).toBe(0.1);
    expect(e.timestamp).toBe(Date.UTC(2026, 0, 1));
  });
});
