import { OrderBook } from "../orderbook";
import { CandleAggregator } from "../candles";
import { VirtualClock } from "./clock";
import { nextOrderId, nextTradeId } from "../ids";
import { matchMarket, submitLimit } from "../matching";
import { makeOrder, type Order, type OrderId, type OrderType, type Side } from "../types";
import type { BookSnapshot, Candle, Symbol, Timeframe, Trade } from "../types";

export const STUDENT_OWNER_ID = "student";

export interface FeederContext {
  nextOrderId: () => string;
  nextTradeId: () => string;
  timestamp: number;
  tickIndex: number;
}

export type Feeder = (book: OrderBook, ctx: FeederContext) => { trades: Trade[] };

export interface EngineConfig {
  symbol: Symbol;
  timeframe: Timeframe;
  intervalMs?: number;
  speed?: number;
  startTime?: number;
  depth?: number;
  feeder: Feeder;
}

type BookSub = (snapshot: BookSnapshot) => void;
type TradeSub = (trade: Trade) => void;
type CandleSub = (closed: Candle | null, current: Candle | null) => void;

export class SimulationEngine {
  readonly book: OrderBook;
  readonly clock: VirtualClock;
  readonly candleAgg: CandleAggregator;
  readonly symbol: Symbol;
  private readonly depth: number;
  private readonly feeder: Feeder;

  private readonly bookSubs = new Set<BookSub>();
  private readonly tradeSubs = new Set<TradeSub>();
  private readonly candleSubs = new Set<CandleSub>();

  constructor(cfg: EngineConfig) {
    this.symbol = cfg.symbol;
    this.book = new OrderBook(cfg.symbol.id);
    this.clock = new VirtualClock({
      intervalMs: cfg.intervalMs ?? 100,
      speed: cfg.speed ?? 1.0,
      startTime: cfg.startTime ?? 0,
    });
    this.candleAgg = new CandleAggregator(cfg.timeframe);
    this.depth = cfg.depth ?? 15;
    this.feeder = cfg.feeder;

    this.clock.onTick((now, tickIndex) => this.onTick(now, tickIndex));
  }

  private onTick(now: number, tickIndex: number): void {
    const { trades } = this.feeder(this.book, {
      nextOrderId,
      nextTradeId,
      timestamp: now,
      tickIndex,
    });
    for (const trade of trades) {
      const { closed, current } = this.candleAgg.onTrade(trade);
      for (const cb of this.tradeSubs) cb(trade);
      for (const cb of this.candleSubs) cb(closed, current);
    }
    const snap = this.book.snapshot(this.depth, now);
    for (const cb of this.bookSubs) cb(snap);
  }

  onBook(cb: BookSub): () => void {
    this.bookSubs.add(cb);
    return () => {
      this.bookSubs.delete(cb);
    };
  }

  onTrade(cb: TradeSub): () => void {
    this.tradeSubs.add(cb);
    return () => {
      this.tradeSubs.delete(cb);
    };
  }

  onCandle(cb: CandleSub): () => void {
    this.candleSubs.add(cb);
    return () => {
      this.candleSubs.delete(cb);
    };
  }

  /**
   * Submit a market or limit order on behalf of the student. The order is
   * matched against the same book the simulator uses; trades and book updates
   * are emitted via the standard subscribers.
   *
   * Returns the order (mutated by matching), the trades it produced, and the
   * best opposite price at submit time (useful for slippage on market orders).
   */
  submitStudentOrder(input: {
    side: Side;
    type: OrderType;
    price: number;
    qty: number;
  }): { order: Order; trades: Trade[]; refOpposite: number | undefined } {
    if (input.qty <= 0) {
      throw new Error(`submitStudentOrder: qty must be > 0, got ${input.qty}`);
    }

    const opposite: Side = input.side === "buy" ? "sell" : "buy";
    const refOpposite = this.book.peekTop(opposite)?.price;

    const order = makeOrder({
      id: nextOrderId(),
      side: input.side,
      type: input.type,
      price: input.price,
      qty: input.qty,
      ownerId: STUDENT_OWNER_ID,
      timestamp: this.clock.now,
    });

    let trades: Trade[] = [];
    if (input.type === "market") {
      const r = matchMarket(this.book, input.side, input.qty, order.id, {
        nextTradeId,
        timestamp: this.clock.now,
      });
      trades = r.trades;
      order.qty = r.unfilled;
      if (r.unfilled === 0) order.status = "filled";
      else if (trades.length > 0) order.status = "partial";
      else order.status = "canceled";
    } else {
      const r = submitLimit(this.book, order, {
        nextTradeId,
        timestamp: this.clock.now,
      });
      trades = r.trades;
    }

    for (const trade of trades) {
      const { closed, current } = this.candleAgg.onTrade(trade);
      for (const cb of this.tradeSubs) cb(trade);
      for (const cb of this.candleSubs) cb(closed, current);
    }
    const snap = this.book.snapshot(this.depth, this.clock.now);
    for (const cb of this.bookSubs) cb(snap);

    return { order, trades, refOpposite };
  }

  cancelStudentOrder(orderId: OrderId): boolean {
    const ok = this.book.cancel(orderId);
    if (ok) {
      const snap = this.book.snapshot(this.depth, this.clock.now);
      for (const cb of this.bookSubs) cb(snap);
    }
    return ok;
  }

  start(): void {
    this.clock.start();
  }
  pause(): void {
    this.clock.pause();
  }
  step(): void {
    this.clock.step();
  }
  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
  }
}
