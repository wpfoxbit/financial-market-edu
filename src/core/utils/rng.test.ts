import { describe, it, expect } from "vitest";
import { RNG } from "./rng";

describe("RNG", () => {
  it("same seed produces same sequence", () => {
    const a = new RNG(42);
    const b = new RNG(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds produce different sequences", () => {
    const a = new RNG(1);
    const b = new RNG(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("next() returns values in [0, 1)", () => {
    const r = new RNG(123);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt is in [min, max] inclusive", () => {
    const r = new RNG(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it("nextBool(p) approaches p over many samples", () => {
    const r = new RNG(99);
    let trues = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) if (r.nextBool(0.3)) trues += 1;
    const ratio = trues / N;
    expect(Math.abs(ratio - 0.3)).toBeLessThan(0.03);
  });

  it("nextChoice picks elements from the array", () => {
    const r = new RNG(5);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(r.nextChoice(arr));
    }
    expect(() => r.nextChoice([])).toThrow();
  });

  it("nextNormal has approximately correct mean and stdev", () => {
    const r = new RNG(17);
    const N = 5000;
    let sum = 0;
    const vals: number[] = [];
    for (let i = 0; i < N; i++) {
      const v = r.nextNormal(10, 2);
      vals.push(v);
      sum += v;
    }
    const mean = sum / N;
    expect(Math.abs(mean - 10)).toBeLessThan(0.15);
    const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / N;
    const stdev = Math.sqrt(variance);
    expect(Math.abs(stdev - 2)).toBeLessThan(0.15);
  });
});
