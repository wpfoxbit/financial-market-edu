import { OrderBook } from "../orderbook";
import { CandleAggregator } from "../candles";
import { VirtualClock } from "../simulation/clock";
import { matchMarket, submitLimit } from "../matching";
import { nextOrderId, nextTradeId } from "../ids";
import { applyFill } from "../pnl";
import { makeOrder, type BookSnapshot, type Candle, type Order, type OrderId, type OrderType, type Side, type Symbol, type Timeframe, type Trade } from "../types";
import type { Account, AccountId } from "./account";
import type { ScenarioGenerator, GeneratorContext, GeneratorEvent } from "../simulation/generators/types";
import { RNG } from "../utils/rng";

export interface SandboxEngineConfig {
  symbol: Symbol;
  timeframe: Timeframe;
  intervalMs?: number;
  speed?: number;
  depth?: number;
}

type BookSub = (snapshot: BookSnapshot) => void;
type TradeSub = (trade: Trade) => void;
type CandleSub = (closed: Candle | null, current: Candle | null) => void;
type AccountSub = (accounts: ReadonlyMap<AccountId, Account>) => void;

export class SandboxEngine {
  readonly book: OrderBook;
  readonly clock: VirtualClock;
  readonly candleAgg: CandleAggregator;
  readonly symbol: Symbol;
  private readonly depth: number;

  private readonly accounts = new Map<AccountId, Account>();
  /** Generator attached to bot accounts, keyed by account ID. */
  private readonly bots = new Map<AccountId, ScenarioGenerator>();
  /** Maps orderId → accountId for routing fills. */
  private readonly orderIndex = new Map<OrderId, AccountId>();
  /** Tracks all orders submitted (for retrieval by id). */
  private readonly allOrders = new Map<OrderId, Order>();
  /** Seeded RNG for bot generators. */
  private readonly rng = new RNG(42);

  private readonly bookSubs = new Set<BookSub>();
  private readonly tradeSubs = new Set<TradeSub>();
  private readonly candleSubs = new Set<CandleSub>();
  private readonly accountSubs = new Set<AccountSub>();

  constructor(cfg: SandboxEngineConfig) {
    this.symbol = cfg.symbol;
    this.book = new OrderBook(cfg.symbol.id);
    this.clock = new VirtualClock({
      intervalMs: cfg.intervalMs ?? 100,
      speed: cfg.speed ?? 1.0,
      startTime: Math.floor(Date.now() / 1000) * 1000,
    });
    this.candleAgg = new CandleAggregator(cfg.timeframe);
    this.depth = cfg.depth ?? 15;

    this.clock.onTick((now, tickIndex) => this.onTick(now, tickIndex));
  }

  // ── Account management ──────────────────────────────────────────

  addAccount(account: Account): void {
    this.accounts.set(account.id, account);
    this.notifyAccounts();
  }

  removeAccount(accountId: AccountId): void {
    // Cancel all open orders belonging to this account.
    const acct = this.accounts.get(accountId);
    if (acct) {
      for (const oid of acct.openOrderIds) {
        this.book.cancel(oid);
        this.orderIndex.delete(oid);
      }
    }
    this.accounts.delete(accountId);
    this.bots.delete(accountId);
    this.notifyAccounts();
    this.emitBookSnapshot();
  }

  getAccount(id: AccountId): Account | undefined {
    return this.accounts.get(id);
  }

  getAccounts(): ReadonlyMap<AccountId, Account> {
    return this.accounts;
  }

  getOrder(orderId: OrderId): Order | undefined {
    return this.allOrders.get(orderId);
  }

  /** Get open orders for a specific account. */
  getOpenOrders(accountId: AccountId): Order[] {
    const account = this.accounts.get(accountId);
    if (!account) return [];
    const orders: Order[] = [];
    for (const oid of account.openOrderIds) {
      const o = this.allOrders.get(oid);
      if (o) orders.push(o);
    }
    return orders;
  }

  // ── Bot management ──────────────────────────────────────────────

  attachBot(accountId: AccountId, generator: ScenarioGenerator): void {
    if (!this.accounts.has(accountId)) return;
    this.bots.set(accountId, generator);
  }

  detachBot(accountId: AccountId): void {
    this.bots.delete(accountId);
  }

  // ── Order submission ────────────────────────────────────────────

  submitOrder(
    accountId: AccountId,
    input: { side: Side; type: OrderType; price: number; qty: number },
  ): { order: Order; trades: Trade[] } | null {
    const account = this.accounts.get(accountId);
    if (!account || input.qty <= 0) return null;

    const order = makeOrder({
      id: nextOrderId(),
      side: input.side,
      type: input.type,
      price: input.price,
      qty: input.qty,
      ownerId: accountId,
      timestamp: this.clock.now,
    });

    this.orderIndex.set(order.id, accountId);
    this.allOrders.set(order.id, order);
    let trades: Trade[] = [];

    if (input.type === "market") {
      const r = matchMarket(this.book, input.side, input.qty, order.id, {
        nextTradeId,
        timestamp: this.clock.now,
      });
      trades = r.trades;
      order.qty = r.unfilled;
      order.status = r.unfilled === 0 ? "filled" : trades.length > 0 ? "partial" : "canceled";
    } else {
      const r = submitLimit(this.book, order, {
        nextTradeId,
        timestamp: this.clock.now,
      });
      trades = r.trades;
    }

    if (order.status === "open" || order.status === "partial") {
      account.openOrderIds.add(order.id);
    }

    this.routeTrades(trades);
    this.emitTrades(trades);
    this.emitBookSnapshot();
    this.notifyAccounts();

    return { order, trades };
  }

  cancelOrder(accountId: AccountId, orderId: OrderId): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return false;
    const ok = this.book.cancel(orderId);
    if (ok) {
      account.openOrderIds.delete(orderId);
      this.orderIndex.delete(orderId);
      this.emitBookSnapshot();
      this.notifyAccounts();
    }
    return ok;
  }

  cancelAllOrders(accountId: AccountId): void {
    const account = this.accounts.get(accountId);
    if (!account) return;
    for (const oid of account.openOrderIds) {
      this.book.cancel(oid);
      this.orderIndex.delete(oid);
    }
    account.openOrderIds.clear();
    this.emitBookSnapshot();
    this.notifyAccounts();
  }

  // ── Clock control ───────────────────────────────────────────────

  start(): void { this.clock.start(); }
  pause(): void { this.clock.pause(); }
  step(): void { this.clock.step(); }
  setSpeed(speed: number): void { this.clock.setSpeed(speed); }

  // ── Subscriptions ───────────────────────────────────────────────

  onBook(cb: BookSub): () => void {
    this.bookSubs.add(cb);
    return () => { this.bookSubs.delete(cb); };
  }

  onTrade(cb: TradeSub): () => void {
    this.tradeSubs.add(cb);
    return () => { this.tradeSubs.delete(cb); };
  }

  onCandle(cb: CandleSub): () => void {
    this.candleSubs.add(cb);
    return () => { this.candleSubs.delete(cb); };
  }

  onAccounts(cb: AccountSub): () => void {
    this.accountSubs.add(cb);
    return () => { this.accountSubs.delete(cb); };
  }

  // ── Internal tick ───────────────────────────────────────────────

  private onTick(now: number, tickIndex: number): void {
    const allTrades: Trade[] = [];

    // Run bot generators.
    for (const [accountId, gen] of this.bots) {
      const ctx: GeneratorContext = {
        book: this.book,
        rng: this.rng,
        nextOrderId,
        timestamp: now,
        tickIndex,
        symbol: this.symbol,
      };
      const events = gen.tick(ctx);
      const trades = this.dispatchEvents(accountId, events, now);
      allTrades.push(...trades);
    }

    if (allTrades.length > 0) {
      this.routeTrades(allTrades);
      this.emitTrades(allTrades);
    }
    this.emitBookSnapshot();
    if (allTrades.length > 0) this.notifyAccounts();
  }

  private dispatchEvents(accountId: AccountId, events: GeneratorEvent[], timestamp: number): Trade[] {
    const trades: Trade[] = [];
    const account = this.accounts.get(accountId);

    for (const ev of events) {
      switch (ev.kind) {
        case "place-limit": {
          // Override ownerId to match the account.
          ev.order.ownerId = accountId;
          this.orderIndex.set(ev.order.id, accountId);
          this.allOrders.set(ev.order.id, ev.order);
          try {
            const r = submitLimit(this.book, ev.order, { nextTradeId, timestamp });
            trades.push(...r.trades);
            if (ev.order.status === "open" || ev.order.status === "partial") {
              account?.openOrderIds.add(ev.order.id);
            }
          } catch {
            // Invalid order — skip.
          }
          break;
        }
        case "cancel": {
          this.book.cancel(ev.orderId);
          account?.openOrderIds.delete(ev.orderId);
          this.orderIndex.delete(ev.orderId);
          break;
        }
        case "market": {
          if (ev.qty <= 0) break;
          const takerId = nextOrderId();
          this.orderIndex.set(takerId, accountId);
          try {
            const r = matchMarket(this.book, ev.side, ev.qty, takerId, { nextTradeId, timestamp });
            trades.push(...r.trades);
          } catch {
            // Empty side — skip.
          }
          break;
        }
      }
    }
    return trades;
  }

  /** Route trade fills to the correct accounts' positions. */
  private routeTrades(trades: Trade[]): void {
    for (const trade of trades) {
      this.routeOneSide(trade, trade.buyOrderId, "buy");
      this.routeOneSide(trade, trade.sellOrderId, "sell");
    }
  }

  private routeOneSide(trade: Trade, orderId: string, side: Side): void {
    const accountId = this.orderIndex.get(orderId);
    if (!accountId) return;
    const account = this.accounts.get(accountId);
    if (!account) return;
    account.position = applyFill(account.position, {
      side,
      price: trade.price,
      qty: trade.qty,
    });
    // Remove from open orders if fully filled.
    if (!this.book.hasOrder(orderId)) {
      account.openOrderIds.delete(orderId);
    }
  }

  // ── Emit helpers ────────────────────────────────────────────────

  private emitBookSnapshot(): void {
    const snap = this.book.snapshot(this.depth, this.clock.now);
    for (const cb of this.bookSubs) cb(snap);
  }

  private emitTrades(trades: Trade[]): void {
    for (const trade of trades) {
      const { closed, current } = this.candleAgg.onTrade(trade);
      for (const cb of this.tradeSubs) cb(trade);
      for (const cb of this.candleSubs) cb(closed, current);
    }
  }

  private notifyAccounts(): void {
    for (const cb of this.accountSubs) cb(this.accounts);
  }
}
