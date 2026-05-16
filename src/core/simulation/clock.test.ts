import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VirtualClock } from "./clock";

describe("VirtualClock", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("step() advances now and tickIndex without a real timer", () => {
    const c = new VirtualClock({ intervalMs: 100 });
    expect(c.now).toBe(0);
    expect(c.tickIndex).toBe(0);
    c.step();
    expect(c.now).toBe(100);
    expect(c.tickIndex).toBe(1);
    c.step();
    c.step();
    expect(c.now).toBe(300);
    expect(c.tickIndex).toBe(3);
  });

  it("notifies subscribers on each tick", () => {
    const c = new VirtualClock({ intervalMs: 100 });
    const calls: Array<[number, number]> = [];
    c.onTick((now, idx) => calls.push([now, idx]));
    c.step();
    c.step();
    expect(calls).toEqual([
      [100, 1],
      [200, 2],
    ]);
  });

  it("unsubscribe stops further notifications", () => {
    const c = new VirtualClock();
    const fn = vi.fn();
    const off = c.onTick(fn);
    c.step();
    off();
    c.step();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("start() schedules ticks at intervalMs / speed in real time", () => {
    const c = new VirtualClock({ intervalMs: 100, speed: 2 });
    const fn = vi.fn();
    c.onTick(fn);
    c.start();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(c.now).toBe(200);
  });

  it("pause() stops the timer", () => {
    const c = new VirtualClock({ intervalMs: 100 });
    const fn = vi.fn();
    c.onTick(fn);
    c.start();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    c.pause();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reset() clears now/tickIndex", () => {
    const c = new VirtualClock();
    c.step();
    c.step();
    c.reset();
    expect(c.now).toBe(0);
    expect(c.tickIndex).toBe(0);
    expect(c.running).toBe(false);
  });

  it("setSpeed rejects non-positive values", () => {
    const c = new VirtualClock();
    expect(() => c.setSpeed(0)).toThrow();
    expect(() => c.setSpeed(-1)).toThrow();
  });
});
