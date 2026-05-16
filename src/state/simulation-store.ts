import { create } from "zustand";
import type {
  BookSnapshot,
  Candle,
  Order,
  OrderId,
  OrderType,
  Side,
  Timeframe,
  Trade,
} from "@core/types";
import { resetIds } from "@core/ids";
import { SimulationEngine } from "@core/simulation/engine";
import { ScenarioPlayer } from "@core/simulation/scenario-player";
import { seedBook } from "@core/simulation/seed-book";
import { CandleAggregator } from "@core/candles";
import type { Scenario } from "@core/simulation/scenario";
import { RNG } from "@core/utils/rng";
import { applyFill, EMPTY_POSITION, type Position, type StudentTrade } from "@core/pnl";
import {
  EXCHANGE_ADAPTERS,
  findAdapter,
  type AdapterStatus,
} from "../adapters";
import type { ExchangeSubscription } from "../adapters/types";
import {
  BUILTIN_SCENARIOS,
  DEFAULT_SCENARIO_ID,
  findBuiltinScenario,
} from "../scenarios";
import {
  deleteCustomScenario as deleteCustomScenarioFromStorage,
  exportScenarioJson,
  loadCustomScenarios,
  saveCustomScenario as saveCustomScenarioToStorage,
} from "../scenarios/storage";

const MAX_TRADES = 200;
const MAX_STUDENT_TRADES = 500;
const MAX_TRADE_LOG = 5000;
const BOOK_DEPTH = 15;

export type ChartType = "candle" | "line" | "renko" | "pf";
export type DataSource = "fake" | string;

const studentOrderIds = new Set<OrderId>();
let chartAgg: CandleAggregator | null = null;
let currentSubscription: ExchangeSubscription | null = null;

interface SimulationState {
  engine: SimulationEngine | null;
  scenario: Scenario | null;
  bookSnapshot: BookSnapshot | null;
  recentTrades: Trade[];
  closedCandles: Candle[];
  currentCandle: Candle | null;
  tradeLog: Trade[];
  isRunning: boolean;
  speed: number;
  customScenarios: Scenario[];
  studentPosition: Position;
  studentTrades: StudentTrade[];
  studentOpenOrders: Order[];
  chartType: ChartType;
  chartTimeframe: Timeframe;
  renkoBrickSize: number;
  pfBoxSize: number;
  pfReversal: number;
  dataSource: DataSource;
  realSymbol: string | null;
  adapterStatus: AdapterStatus | null;
  _unsubs: Array<() => void>;

  bootstrap: () => void;
  loadScenario: (idOrScenario: string | Scenario) => void;
  resetScenario: () => void;
  importScenario: (scenario: Scenario) => void;
  deleteCustomScenario: (id: string) => void;
  exportCurrentScenario: () => string | null;
  submitStudentOrder: (input: { side: Side; type: OrderType; price: number; qty: number }) =>
    | { ok: true; orderId: OrderId }
    | { ok: false; error: string };
  cancelStudentOrder: (orderId: OrderId) => void;
  setChartType: (t: ChartType) => void;
  setChartTimeframe: (tf: Timeframe) => void;
  setRenkoBrickSize: (size: number) => void;
  setPfBoxSize: (size: number) => void;
  setPfReversal: (n: number) => void;
  setDataSource: (id: DataSource, symbol?: string) => void;
  setRealSymbol: (symbol: string) => void;
  start: () => void;
  pause: () => void;
  step: () => void;
  setSpeed: (s: number) => void;
}

function findScenario(id: string, customs: Scenario[]): Scenario | undefined {
  return findBuiltinScenario(id) ?? customs.find((s) => s.id === id);
}

function buildEngine(scenario: Scenario): SimulationEngine {
  resetIds();
  studentOrderIds.clear();
  const player = new ScenarioPlayer(scenario);
  const engine = new SimulationEngine({
    symbol: scenario.symbol,
    timeframe: scenario.timeframe,
    intervalMs: 100,
    depth: BOOK_DEPTH,
    startTime: Math.floor(Date.now() / 1000) * 1000,
    feeder: player.feeder,
  });
  seedBook(engine.book, {
    mid: scenario.initialMidPrice,
    spread: scenario.seedSpread,
    levels: scenario.seedLevels,
    qtyPerLevel: scenario.seedQtyPerLevel,
    tickSize: scenario.symbol.tickSize,
    qtyStep: scenario.symbol.qtyStep,
    rng: new RNG(scenario.seed),
  });
  return engine;
}

function computeSlippage(side: Side, fillPrice: number, refPrice: number): number {
  return side === "buy" ? fillPrice - refPrice : refPrice - fillPrice;
}

function rebuildCandles(tf: Timeframe, tradeLog: readonly Trade[]) {
  chartAgg = new CandleAggregator(tf);
  for (const t of tradeLog) chartAgg.onTrade(t);
  return { closed: [...chartAgg.history()], current: chartAgg.open() };
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  engine: null,
  scenario: null,
  bookSnapshot: null,
  recentTrades: [],
  closedCandles: [],
  currentCandle: null,
  tradeLog: [],
  isRunning: false,
  speed: 1.0,
  customScenarios: [],
  studentPosition: EMPTY_POSITION,
  studentTrades: [],
  studentOpenOrders: [],
  chartType: "candle",
  chartTimeframe: "1s",
  renkoBrickSize: 5,
  pfBoxSize: 5,
  pfReversal: 3,
  dataSource: "fake",
  realSymbol: null,
  adapterStatus: null,
  _unsubs: [],

  bootstrap: () => {
    const customs = loadCustomScenarios();
    set({ customScenarios: customs });
    get().loadScenario(DEFAULT_SCENARIO_ID);
  },

  loadScenario: (idOrScenario) => {
    const customs = get().customScenarios;
    const scenario =
      typeof idOrScenario === "string" ? findScenario(idOrScenario, customs) : idOrScenario;
    if (!scenario) return;

    // Tear down adapter (if any) and previous engine subs.
    currentSubscription?.unsubscribe();
    currentSubscription = null;
    for (const off of get()._unsubs) off();
    get().engine?.pause();

    const engine = buildEngine(scenario);
    const tf = scenario.timeframe;
    chartAgg = new CandleAggregator(tf);

    const unsubs: Array<() => void> = [
      engine.onBook((snapshot) => set({ bookSnapshot: snapshot })),
      engine.onTrade((trade) => {
        const recent = get().recentTrades;
        const nextRecent =
          recent.length >= MAX_TRADES
            ? [trade, ...recent.slice(0, MAX_TRADES - 1)]
            : [trade, ...recent];

        const r = chartAgg!.onTrade(trade);

        const tradeLog = get().tradeLog;
        const nextLog =
          tradeLog.length >= MAX_TRADE_LOG
            ? [...tradeLog.slice(tradeLog.length - MAX_TRADE_LOG + 1), trade]
            : [...tradeLog, trade];

        let studentSide: Side | null = null;
        let studentOrderId: OrderId | null = null;
        if (studentOrderIds.has(trade.buyOrderId)) {
          studentSide = "buy";
          studentOrderId = trade.buyOrderId;
        } else if (studentOrderIds.has(trade.sellOrderId)) {
          studentSide = "sell";
          studentOrderId = trade.sellOrderId;
        }

        if (studentSide && studentOrderId) {
          const pos = applyFill(get().studentPosition, {
            side: studentSide,
            price: trade.price,
            qty: trade.qty,
          });
          const st: StudentTrade = {
            id: trade.id,
            orderId: studentOrderId,
            side: studentSide,
            price: trade.price,
            qty: trade.qty,
            timestamp: trade.timestamp,
            orderType: "limit",
            slippage: 0,
          };
          const eng = get().engine;
          const updatedOpen = get()
            .studentOpenOrders.map((o) =>
              o.id === studentOrderId && eng && eng.book.hasOrder(o.id) ? { ...o } : o,
            )
            .filter((o) => eng?.book.hasOrder(o.id));

          set((s) => ({
            recentTrades: nextRecent,
            tradeLog: nextLog,
            closedCandles: r.closed ? [...s.closedCandles, r.closed] : s.closedCandles,
            currentCandle: r.current,
            studentPosition: pos,
            studentTrades: [st, ...s.studentTrades].slice(0, MAX_STUDENT_TRADES),
            studentOpenOrders: updatedOpen,
          }));
        } else {
          set((s) => ({
            recentTrades: nextRecent,
            tradeLog: nextLog,
            closedCandles: r.closed ? [...s.closedCandles, r.closed] : s.closedCandles,
            currentCandle: r.current,
          }));
        }
      }),
    ];

    set({
      engine,
      scenario,
      bookSnapshot: engine.book.snapshot(BOOK_DEPTH, engine.clock.now),
      recentTrades: [],
      closedCandles: [],
      currentCandle: null,
      tradeLog: [],
      isRunning: false,
      speed: engine.clock.speed,
      studentPosition: EMPTY_POSITION,
      studentTrades: [],
      studentOpenOrders: [],
      chartTimeframe: tf,
      renkoBrickSize: scenario.symbol.tickSize * 10,
      pfBoxSize: scenario.symbol.tickSize * 10,
      dataSource: "fake",
      realSymbol: null,
      adapterStatus: null,
      _unsubs: unsubs,
    });
  },

  resetScenario: () => {
    const cur = get().scenario;
    if (cur) get().loadScenario(cur);
  },

  importScenario: (scenario) => {
    const next = saveCustomScenarioToStorage(scenario);
    set({ customScenarios: next });
  },

  deleteCustomScenario: (id) => {
    const next = deleteCustomScenarioFromStorage(id);
    set({ customScenarios: next });
    if (get().scenario?.id === id) get().loadScenario(DEFAULT_SCENARIO_ID);
  },

  exportCurrentScenario: () => {
    const cur = get().scenario;
    return cur ? exportScenarioJson(cur) : null;
  },

  submitStudentOrder: (input) => {
    if (get().dataSource !== "fake") {
      return { ok: false, error: "Student orders are disabled in live-exchange mode" };
    }
    const engine = get().engine;
    if (!engine) return { ok: false, error: "no engine" };
    if (input.qty <= 0) return { ok: false, error: "qty must be > 0" };

    let order: Order;
    let trades: Trade[];
    let refOpposite: number | undefined;
    try {
      const r = engine.submitStudentOrder(input);
      order = r.order;
      trades = r.trades;
      refOpposite = r.refOpposite;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    let pos = get().studentPosition;
    const newStudentTrades: StudentTrade[] = [];
    for (const t of trades) {
      const tradeSide: Side = t.buyOrderId === order.id ? "buy" : "sell";
      pos = applyFill(pos, { side: tradeSide, price: t.price, qty: t.qty });
      const slippage =
        input.type === "market" && refOpposite !== undefined
          ? computeSlippage(tradeSide, t.price, refOpposite)
          : 0;
      newStudentTrades.push({
        id: t.id,
        orderId: order.id,
        side: tradeSide,
        price: t.price,
        qty: t.qty,
        timestamp: t.timestamp,
        orderType: input.type,
        refPrice: refOpposite,
        slippage,
      });
    }

    studentOrderIds.add(order.id);
    const stillOpen = order.status === "open" || order.status === "partial";

    set((s) => ({
      studentPosition: pos,
      studentTrades: [...newStudentTrades.reverse(), ...s.studentTrades].slice(
        0,
        MAX_STUDENT_TRADES,
      ),
      studentOpenOrders: stillOpen ? [{ ...order }, ...s.studentOpenOrders] : s.studentOpenOrders,
    }));

    return { ok: true, orderId: order.id };
  },

  cancelStudentOrder: (orderId) => {
    const engine = get().engine;
    if (!engine) return;
    engine.cancelStudentOrder(orderId);
    set((s) => ({
      studentOpenOrders: s.studentOpenOrders.filter((o) => o.id !== orderId),
    }));
  },

  setChartType: (t) => set({ chartType: t }),
  setChartTimeframe: (tf) => {
    const { closed, current } = rebuildCandles(tf, get().tradeLog);
    set({ chartTimeframe: tf, closedCandles: closed, currentCandle: current });
  },
  setRenkoBrickSize: (size) => set({ renkoBrickSize: Math.max(0.0001, size) }),
  setPfBoxSize: (size) => set({ pfBoxSize: Math.max(0.0001, size) }),
  setPfReversal: (n) => set({ pfReversal: Math.max(1, Math.floor(n)) }),

  setDataSource: (id, symbolOpt) => {
    currentSubscription?.unsubscribe();
    currentSubscription = null;

    if (id === "fake") {
      const cur = get().scenario;
      if (cur) get().loadScenario(cur);
      else get().loadScenario(DEFAULT_SCENARIO_ID);
      return;
    }

    const adapter = findAdapter(id);
    if (!adapter) return;
    const symbol = symbolOpt ?? get().realSymbol ?? adapter.symbols()[0]!;

    // Pause sim engine while we display live data.
    get().engine?.pause();

    // Reset the visible feed for the new source.
    chartAgg = new CandleAggregator(get().chartTimeframe);
    set({
      dataSource: id,
      realSymbol: symbol,
      bookSnapshot: null,
      recentTrades: [],
      closedCandles: [],
      currentCandle: null,
      tradeLog: [],
      isRunning: false,
      adapterStatus: "connecting",
    });

    currentSubscription = adapter.subscribe(symbol, {
      onStatus: (status) => set({ adapterStatus: status }),
      onBook: (e) =>
        set({
          bookSnapshot: {
            symbol: e.symbol,
            bids: e.bids
              .slice(0, BOOK_DEPTH)
              .map((b) => ({ price: b.price, qty: b.qty, orderCount: 1 })),
            asks: e.asks
              .slice(0, BOOK_DEPTH)
              .map((a) => ({ price: a.price, qty: a.qty, orderCount: 1 })),
            timestamp: e.timestamp,
          },
        }),
      onTrade: (e) => {
        const trade: Trade = {
          id: `${e.symbol}-${e.id}`,
          price: e.price,
          qty: e.qty,
          buyOrderId: e.side === "buy" ? `ext-taker-${e.id}` : `ext-maker-${e.id}`,
          sellOrderId: e.side === "sell" ? `ext-taker-${e.id}` : `ext-maker-${e.id}`,
          aggressorSide: e.side,
          timestamp: e.timestamp,
        };

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

        const r = chartAgg ? chartAgg.onTrade(trade) : { closed: null, current: null };

        set((s) => ({
          recentTrades: nextRecent,
          tradeLog: nextLog,
          closedCandles: r.closed ? [...s.closedCandles, r.closed] : s.closedCandles,
          currentCandle: r.current,
        }));
      },
      onError: (err) => {
        console.error(`[${id}] adapter error`, err);
      },
    });
  },

  setRealSymbol: (symbol) => {
    const cur = get().dataSource;
    if (cur === "fake") return;
    get().setDataSource(cur, symbol);
  },

  start: () => {
    if (get().dataSource !== "fake") return;
    get().engine?.start();
    set({ isRunning: true });
  },
  pause: () => {
    get().engine?.pause();
    set({ isRunning: false });
  },
  step: () => {
    if (get().dataSource !== "fake") return;
    get().engine?.step();
  },
  setSpeed: (s) => {
    get().engine?.setSpeed(s);
    set({ speed: s });
  },
}));

export { BUILTIN_SCENARIOS, EXCHANGE_ADAPTERS };
