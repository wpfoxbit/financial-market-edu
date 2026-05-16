import type { Timeframe } from "../types";

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1s": 1_000,
  "5s": 5_000,
  "15s": 15_000,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
};

export function bucketStart(timestamp: number, tf: Timeframe): number {
  const ms = TIMEFRAME_MS[tf];
  return Math.floor(timestamp / ms) * ms;
}
