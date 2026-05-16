export type Timeframe = "1s" | "5s" | "15s" | "1m" | "5m" | "15m" | "1h";

export interface Candle {
  timeframe: Timeframe;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}
