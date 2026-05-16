import type { Candle, Timeframe, Trade } from "../types";
import { bucketStart } from "./timeframes";

export class CandleAggregator {
  readonly timeframe: Timeframe;
  private current: Candle | null = null;
  private readonly closed: Candle[] = [];

  constructor(timeframe: Timeframe) {
    this.timeframe = timeframe;
  }

  onTrade(trade: Trade): { closed: Candle | null; current: Candle } {
    const start = bucketStart(trade.timestamp, this.timeframe);
    let justClosed: Candle | null = null;

    if (this.current && start > this.current.timestamp) {
      justClosed = this.current;
      this.closed.push(justClosed);
      this.current = null;
    }

    if (!this.current) {
      this.current = {
        timeframe: this.timeframe,
        timestamp: start,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.qty,
        trades: 1,
      };
    } else {
      if (trade.price > this.current.high) this.current.high = trade.price;
      if (trade.price < this.current.low) this.current.low = trade.price;
      this.current.close = trade.price;
      this.current.volume += trade.qty;
      this.current.trades += 1;
    }

    return { closed: justClosed, current: this.current };
  }

  history(): readonly Candle[] {
    return this.closed;
  }

  open(): Candle | null {
    return this.current;
  }

  closeCurrent(): Candle | null {
    if (!this.current) return null;
    const c = this.current;
    this.closed.push(c);
    this.current = null;
    return c;
  }

  reset(): void {
    this.current = null;
    this.closed.length = 0;
  }
}
