import { createContext, useContext } from "react";
import type { BookSnapshot, Candle, Order, OrderId, OrderType, Side, Timeframe, Trade } from "@core/types";
import type { Position, StudentTrade } from "@core/pnl";
import type { Scenario } from "@core/simulation/scenario";
import type { ChartType } from "@state/simulation-store";

/**
 * Normalized interface that both the main simulation store and the sandbox
 * store can provide. Components read from this context to stay agnostic.
 */
export interface SimulationAdapter {
  // Book / market data
  bookSnapshot: BookSnapshot | null;
  recentTrades: Trade[];
  closedCandles: Candle[];
  currentCandle: Candle | null;
  tradeLog: Trade[];

  // Student/account state
  studentPosition: Position;
  studentTrades: StudentTrade[];
  studentOpenOrders: Order[];

  // Actions
  submitOrder: (input: { side: Side; type: OrderType; price: number; qty: number }) =>
    | { ok: true; orderId: OrderId }
    | { ok: false; error: string };
  cancelOrder: (orderId: OrderId) => void;
  cancelAllOrders: () => void;
  flattenPosition: () => void;

  // Price-fill signal
  ticketPrice: number | null;
  ticketSide: Side | null;
  setTicketPrice: (price: number, side?: Side) => void;
  clearTicketPrice: () => void;

  // Quick order popover
  quickOrder: { price: number; side: Side; x: number; y: number } | null;
  openQuickOrder: (price: number, side: Side, x: number, y: number) => void;
  closeQuickOrder: () => void;

  // Simulation control
  isRunning: boolean;
  speed: number;
  start: () => void;
  pause: () => void;
  step: () => void;
  setSpeed: (s: number) => void;

  // Chart
  chartType: ChartType;
  chartTimeframe: Timeframe;
  renkoBrickSize: number;
  pfBoxSize: number;
  pfReversal: number;
  setChartType: (t: ChartType) => void;
  setChartTimeframe: (tf: Timeframe) => void;
  setRenkoBrickSize: (size: number) => void;
  setPfBoxSize: (size: number) => void;
  setPfReversal: (n: number) => void;

  // Context
  scenario: Scenario | null;
  dataSource: string;
  isReadOnly: boolean;
}

const SimulationContext = createContext<SimulationAdapter | null>(null);

export const SimulationProvider = SimulationContext.Provider;

export function useSimulation(): SimulationAdapter {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within a SimulationProvider");
  return ctx;
}
