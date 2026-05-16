/**
 * Seeded pseudo-random number generator (mulberry32 variant).
 * Same seed → same sequence forever. Required for replayable scenarios.
 */
export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Uniform float in [min, max). */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** True with probability p ∈ [0, 1]. */
  nextBool(p: number): boolean {
    return this.next() < p;
  }

  /** Pick a uniformly random element from arr. */
  nextChoice<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("RNG.nextChoice: empty array");
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** Normal-distributed value via Box-Muller. */
  nextNormal(mean: number, stdev: number): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return z * stdev + mean;
  }
}
