import { describe, it, expect } from "vitest";
import { PFStream } from "./pf";

describe("PFStream", () => {
  it("starts with an X column on first feed", () => {
    const s = new PFStream(1, 3);
    s.feed(100);
    expect(s.columns).toHaveLength(1);
    expect(s.columns[0]).toMatchObject({ type: "X", topBox: 100, bottomBox: 100 });
  });

  it("extends current X column as price rises", () => {
    const s = new PFStream(1, 3);
    s.feed(100);
    s.feed(101);
    s.feed(105);
    expect(s.columns).toHaveLength(1);
    expect(s.columns[0]!.topBox).toBe(105);
  });

  it("requires reversalThreshold boxes to switch from X to O", () => {
    const s = new PFStream(1, 3);
    s.feed(100);
    s.feed(105);
    // 2-box pullback — not enough
    s.feed(103);
    expect(s.columns).toHaveLength(1);
    // 3-box pullback from peak (105 → 102) — reverses
    s.feed(102);
    expect(s.columns).toHaveLength(2);
    expect(s.columns[1]!.type).toBe("O");
    expect(s.columns[1]!.topBox).toBe(104);
    expect(s.columns[1]!.bottomBox).toBe(102);
  });

  it("extends O column as price keeps dropping", () => {
    const s = new PFStream(1, 3);
    s.feed(100);
    s.feed(105);
    s.feed(102);
    s.feed(98);
    expect(s.columns).toHaveLength(2);
    expect(s.columns[1]!.bottomBox).toBe(98);
  });

  it("reverses back to X after a 3-box rally from O bottom", () => {
    const s = new PFStream(1, 3);
    s.feed(100);
    s.feed(105);
    s.feed(102);
    s.feed(98);
    s.feed(101);
    expect(s.columns).toHaveLength(3);
    expect(s.columns[2]!.type).toBe("X");
    expect(s.columns[2]!.bottomBox).toBe(99);
    expect(s.columns[2]!.topBox).toBe(101);
  });

  it("range reports min and max box across columns", () => {
    const s = new PFStream(1, 3);
    s.feed(100);
    s.feed(105);
    s.feed(102);
    s.feed(98);
    expect(s.range()).toEqual({ minBox: 98, maxBox: 105 });
  });

  it("rejects non-positive boxSize or zero reversal", () => {
    expect(() => new PFStream(0, 3)).toThrow();
    expect(() => new PFStream(1, 0)).toThrow();
  });
});
