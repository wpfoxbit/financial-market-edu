import { create } from "zustand";
import { resetIds, nextOrderId } from "@core/ids";
import { CandleAggregator } from "@core/candles";
import { EMPTY_POSITION, type Position } from "@core/pnl";
import type { StudentTrade } from "@core/pnl";
import type {
  BookSnapshot,
  Candle,
  Order,
  OrderId,
  OrderType,
  Side,
  Symbol,
  Timeframe,
  Trade,
} from "@core/types";
import type { ChartType } from "./simulation-store";
import {
  SandboxEngine,
  createAccount,
  resetAccountIds,
  seedSandboxBook,
  generateBulkOrders,
  type Account,
  type AccountId,
  type AccountKind,
} from "@core/sandbox";
import {
  LiquidityGen,
  AggressionGen,
  type LiquidityGenParams,
  type AggressionGenParams,
} from "@core/simulation/generators";

const MAX_TRADES = 200;
const MAX_TRADE_LOG = 5000;
const BOOK_DEPTH = 15;

const DEFAULT_SYMBOL: Symbol = {
  id: "SANDBOX/USD",
  base: "SANDBOX",
  quote: "USD",
  tickSize: 0.5,
  qtyStep: 0.01,
};

export interface BookConfig {
  midPrice: number;
  spread: number;
  levels: number;
  defaultQty: number;
  customVolumes: Map<number, number>;
  tickSize: number;
  qtyStep: number;
}

export interface LiquidityBotConfig {
  referencePrice: number;
  targetSpread: number;
  targetLevels: number;
  qtyMean: number;
  qtyStdev: number;
  refreshChance: number;
}

export interface MarketBotConfig {
  lambda: number;
  sizeMean: number;
  sizeStdev: number;
  sideBias: number;
}

interface SandboxState {
  engine: SandboxEngine | null;
  accounts: Account[];
  activeAccountId: AccountId | null;
  bookConfig: BookConfig;
  symbol: Symbol;
  timeframe: Timeframe;
  bookSnapshot: BookSnapshot | null;
  recentTrades: Trade[];
  closedCandles: Candle[];
  currentCandle: Candle | null;
  tradeLog: Trade[];
  isRunning: boolean;
  speed: number;
  /** Per-account open orders for the active account. */
  activeOpenOrders: Order[];
  /** Per-account position for the active account. */
  activePosition: Position;
  /** Per-account student trades for the active account (for display). */
  activeStudentTrades: StudentTrade[];
  chartType: ChartType;
  chartTimeframe: Timeframe;
  renkoBrickSize: number;
  pfBoxSize: number;
  pfReversal: number;
  ticketPrice: number | null;
  ticketSide: Side | null;
  quickOrder: { price: number; side: Side; x: number; y: number } | null;
  _unsubs: Array<() => void>;

  initSandbox: () => void;
  createAccount: (name: string, kind?: AccountKind) => void;
  removeAccount: (id: AccountId) => void;
  setActiveAccount: (id: AccountId) => void;
  submitOrder: (input: { side: Side; type: OrderType; price: number; qty: number }) =>
    | { ok: true; orderId: OrderId }
    | { ok: false; error: string };
  submitBulkOrders: (
    accountId: AccountId,
    config: { side: Side; startPrice: number; endPrice: number; count: number; qtyPerOrder: number },
  ) => void;
  cancelOrder: (orderId: OrderId) => void;
  cancelAllOrders: () => void;
  flattenPosition: () => void;
  attachLiquidityBot: (accountId: AccountId, config: LiquidityBotConfig) => void;
  attachMarketBot: (accountId: AccountId, config: MarketBotConfig) => void;
  detachBot: (accountId: AccountId) => void;
  updateBookConfig: (partial: Partial<BookConfig>) => void;
  setCustomVolume: (price: number, qty: number) => void;
  setChartType: (t: ChartType) => void;
  setChartTimeframe: (tf: Timeframe) => void;
  setRenkoBrickSize: (size: number) => void;
  setPfBoxSize: (size: number) => void;
  setPfReversal: (n: number) => void;
  setSymbol: (symbol: Symbol) => void;
  setTimeframe: (tf: Timeframe) => void;
  setTicketPrice: (price: number, side?: Side) => void;
  clearTicketPrice: () => void;
  openQuickOrder: (price: number, side: Side, x: number, y: number) => void;
  closeQuickOrder: () => void;
  start: () => void;
  pause: () => void;
  step: () => void;
  setSpeed: (s: number) => void;
  teardown: () => void;
}

let chartAgg: CandleAggregator | null = null;

function defaultBookConfig(): BookConfig {
  return {
    midPrice: 50000,
    spread: 1,
    levels: 52,
    defaultQty: 1,
    customVolumes: new Map(),
    tickSize: DEFAULT_SYMBOL.tickSize,
    qtyStep: DEFAULT_SYMBOL.qtyStep,
  };
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  engine: null,
  accounts: [],
  activeAccountId: null,
  bookConfig: defaultBookConfig(),
  symbol: DEFAULT_SYMBOL,
  timeframe: "1s",
  bookSnapshot: null,
  recentTrades: [],
  closedCandles: [],
  currentCandle: null,
  tradeLog: [],
  isRunning: false,
  speed: 1.0,
  activeOpenOrders: [],
  activePosition: EMPTY_POSITION,
  activeStudentTrades: [],
  chartType: "candle",
  chartTimeframe: "1s",
  renkoBrickSize: 5,
  pfBoxSize: 5,
  pfReversal: 3,
  ticketPrice: null,
  ticketSide: null,
  quickOrder: null,
  _unsubs: [],

  initSandbox: () => {
    // Tear down previous engine.
    for (const off of get()._unsubs) off();
    get().engine?.pause();

    resetIds();
    resetAccountIds();

    const { symbol, timeframe, bookConfig } = get();
    const engine = new SandboxEngine({ symbol, timeframe, depth: BOOK_DEPTH });

    // Seed book from config.
    seedSandboxBook(engine.book, {
      midPrice: bookConfig.midPrice,
      spread: bookConfig.spread,
      levels: bookConfig.levels,
      defaultQty: bookConfig.defaultQty,
      customVolumes: bookConfig.customVolumes,
      tickSize: bookConfig.tickSize,
      qtyStep: bookConfig.qtyStep,
      nextOrderId,
    });

    chartAgg = new CandleAggregator(timeframe);

    const unsubs: Array<() => void> = [
      engine.onBook((snapshot) => set({ bookSnapshot: snapshot })),
      engine.onTrade((trade) => {
        const recent = get().recentTrades;
        const nextRecent =
          recent.length >= MAX_TRADES
            ? [trade, ...recent.slice(0, MAX_TRADES - 1)]
            : [trade, ...recent];
        const tradeLog = get().tradeLog;
        const nextLog =
          tradeLog.length >= MAX_TRADE_LOG
            ? [...tradeLog.slice(tradeLog.length - MAX_TRADE_LOG + 1), trade]
            : [...tradeLog, trade];
        const r = chartAgg!.onTrade(trade);
        set((s) => ({
          recentTrades: nextRecent,
          tradeLog: nextLog,
          closedCandles: r.closed ? [...s.closedCandles, r.closed] : s.closedCandles,
          currentCandle: r.current,
        }));
      }),
      engine.onAccounts(() => {
        // Sync the accounts list and active account state.
        const accts = [...engine.getAccounts().values()];
        const activeId = get().activeAccountId;
        const active = activeId ? engine.getAccount(activeId) : undefined;
        set({
          accounts: accts,
          activePosition: active?.position ?? EMPTY_POSITION,
          activeOpenOrders: activeId ? engine.getOpenOrders(activeId) : [],
        });
      }),
    ];

    set({
      engine,
      bookSnapshot: engine.book.snapshot(BOOK_DEPTH, engine.clock.now),
      recentTrades: [],
      closedCandles: [],
      currentCandle: null,
      tradeLog: [],
      isRunning: false,
      speed: 1.0,
      accounts: [],
      activeAccountId: null,
      activeOpenOrders: [],
      activePosition: EMPTY_POSITION,
      activeStudentTrades: [],
      ticketPrice: null,
      ticketSide: null,
      quickOrder: null,
      _unsubs: unsubs,
    });
  },

  createAccount: (name, kind = "manual") => {
    const engine = get().engine;
    if (!engine) return;
    const account = createAccount(name, kind);
    engine.addAccount(account);
    // Auto-select the first account.
    if (!get().activeAccountId) {
      set({ activeAccountId: account.id });
    }
  },

  removeAccount: (id) => {
    const engine = get().engine;
    if (!engine) return;
    engine.removeAccount(id);
    if (get().activeAccountId === id) {
      const remaining = [...engine.getAccounts().values()];
      set({ activeAccountId: remaining[0]?.id ?? null });
    }
  },

  setActiveAccount: (id) => {
    const engine = get().engine;
    if (!engine) return;
    const account = engine.getAccount(id);
    set({
      activeAccountId: id,
      activePosition: account?.position ?? EMPTY_POSITION,
      activeOpenOrders: engine.getOpenOrders(id),
    });
  },

  submitOrder: (input) => {
    const engine = get().engine;
    const activeId = get().activeAccountId;
    if (!engine || !activeId) return { ok: false, error: "No active account" };
    if (input.qty <= 0) return { ok: false, error: "qty must be > 0" };

    const result = engine.submitOrder(activeId, input);
    if (!result) return { ok: false, error: "Order failed" };
    return { ok: true, orderId: result.order.id };
  },

  submitBulkOrders: (accountId, config) => {
    const engine = get().engine;
    if (!engine) return;
    const { symbol } = get();
    const orders = generateBulkOrders({
      side: config.side,
      startPrice: config.startPrice,
      endPrice: config.endPrice,
      count: config.count,
      qtyPerOrder: config.qtyPerOrder,
      tickSize: symbol.tickSize,
      qtyStep: symbol.qtyStep,
      ownerId: accountId,
      nextOrderId,
      timestamp: engine.clock.now,
    });
    for (const order of orders) {
      engine.submitOrder(accountId, {
        side: order.side,
        type: "limit",
        price: order.price,
        qty: order.qty,
      });
    }
  },

  cancelOrder: (orderId) => {
    const engine = get().engine;
    const activeId = get().activeAccountId;
    if (!engine || !activeId) return;
    engine.cancelOrder(activeId, orderId);
  },

  cancelAllOrders: () => {
    const engine = get().engine;
    const activeId = get().activeAccountId;
    if (!engine || !activeId) return;
    engine.cancelAllOrders(activeId);
  },

  flattenPosition: () => {
    const pos = get().activePosition;
    if (pos.netQty === 0) return;
    const side: Side = pos.netQty > 0 ? "sell" : "buy";
    get().submitOrder({ side, type: "market", price: 0, qty: Math.abs(pos.netQty) });
  },

  attachLiquidityBot: (accountId, config) => {
    const engine = get().engine;
    if (!engine) return;
    const { symbol } = get();
    const params: LiquidityGenParams = {
      referencePrice: config.referencePrice,
      targetSpread: config.targetSpread,
      targetLevels: config.targetLevels,
      qtyMean: config.qtyMean,
      qtyStdev: config.qtyStdev,
      refreshChance: config.refreshChance,
      tickSize: symbol.tickSize,
      qtyStep: symbol.qtyStep,
    };
    engine.attachBot(accountId, new LiquidityGen(accountId, params));
  },

  attachMarketBot: (accountId, config) => {
    const engine = get().engine;
    if (!engine) return;
    const { symbol } = get();
    const params: AggressionGenParams = {
      lambda: config.lambda,
      sizeMean: config.sizeMean,
      sizeStdev: config.sizeStdev,
      sideBias: config.sideBias,
      qtyStep: symbol.qtyStep,
    };
    engine.attachBot(accountId, new AggressionGen(accountId, params));
  },

  detachBot: (accountId) => {
    get().engine?.detachBot(accountId);
  },

  updateBookConfig: (partial) => {
    set((s) => ({ bookConfig: { ...s.bookConfig, ...partial } }));
  },

  setCustomVolume: (price, qty) => {
    const cfg = get().bookConfig;
    const next = new Map(cfg.customVolumes);
    if (qty <= 0) next.delete(price);
    else next.set(price, qty);
    set({ bookConfig: { ...cfg, customVolumes: next } });
  },

  setChartType: (t) => set({ chartType: t }),
  setChartTimeframe: (tf) => {
    chartAgg = new CandleAggregator(tf);
    for (const t of get().tradeLog) chartAgg.onTrade(t);
    set({
      chartTimeframe: tf,
      closedCandles: [...chartAgg.history()],
      currentCandle: chartAgg.open(),
    });
  },
  setRenkoBrickSize: (size) => set({ renkoBrickSize: Math.max(0.0001, size) }),
  setPfBoxSize: (size) => set({ pfBoxSize: Math.max(0.0001, size) }),
  setPfReversal: (n) => set({ pfReversal: Math.max(1, Math.floor(n)) }),

  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (tf) => set({ timeframe: tf }),

  setTicketPrice: (price, side) => set({ ticketPrice: price, ticketSide: side ?? null }),
  clearTicketPrice: () => set({ ticketPrice: null, ticketSide: null }),
  openQuickOrder: (price, side, x, y) => set({ quickOrder: { price, side, x, y } }),
  closeQuickOrder: () => set({ quickOrder: null }),

  start: () => {
    get().engine?.start();
    set({ isRunning: true });
  },
  pause: () => {
    get().engine?.pause();
    set({ isRunning: false });
  },
  step: () => {
    get().engine?.step();
  },
  setSpeed: (s) => {
    get().engine?.setSpeed(s);
    set({ speed: s });
  },

  teardown: () => {
    for (const off of get()._unsubs) off();
    get().engine?.pause();
    set({
      engine: null,
      _unsubs: [],
      isRunning: false,
    });
  },
}));

