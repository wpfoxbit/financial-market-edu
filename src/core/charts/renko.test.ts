import { describe, it, expect } from "vitest";
import { RenkoStream } from "./renko";

describe("RenkoStream", () => {
  it("emits no brick on the first trade (initialization only)", () => {
    const s = new RenkoStream(1);
    expect(s.feed(100).length).toBe(0);
    expect(s.bricks.length).toBe(0);
  });

  it("emits one up brick when price rises by one brickSize", () => {
    const s = new RenkoStream(1);
    s.feed(100);
    const out = s.feed(101);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ side: "up", openPrice: 100, closePrice: 101 });
  });

  it("emits multiple up bricks for a large move", () => {
    const s = new RenkoStream(1);
    s.feed(100);
    const out = s.feed(104);
    expect(out).toHaveLength(4);
    expect(out.map((b) => b.closePrice)).toEqual([101, 102, 103, 104]);
    expect(out.every((b) => b.side === "up")).toBe(true);
  });

  it("emits a down brick when price drops by one brickSize", () => {
    const s = new RenkoStream(1);
    s.feed(100);
    const out = s.feed(99);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ side: "down", openPrice: 100, closePrice: 99 });
  });

  it("does not emit when price moves less than brickSize", () => {
    const s = new RenkoStream(2);
    s.feed(100);
    expect(s.feed(101.5).length).toBe(0);
    expect(s.feed(100.7).length).toBe(0);
  });

  it("aligns starting price to the nearest brick boundary", () => {
    const s = new RenkoStream(5);
    s.feed(103); // rounds to 105
    const out = s.feed(110);
    expect(out).toHaveLength(1);
    expect(out[0]!.openPrice).toBe(105);
    expect(out[0]!.closePrice).toBe(110);
  });

  it("rejects non-positive brickSize", () => {
    expect(() => new RenkoStream(0)).toThrow();
    expect(() => new RenkoStream(-1)).toThrow();
  });
});
