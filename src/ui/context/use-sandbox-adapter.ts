import { useMemo } from "react";
import { useSandboxStore } from "@state/sandbox-store";
import type { Scenario } from "@core/simulation/scenario";
import type { SimulationAdapter } from "./simulation-context";

/** Bridges useSandboxStore → SimulationAdapter for the sandbox workspace. */
export function useSandboxAdapter(): SimulationAdapter {
  const s = useSandboxStore();

  // Build a synthetic scenario-like object for components that need tickSize/qtyStep.
  const scenario = useMemo(
    (): Scenario => ({
      id: "sandbox",
      name: "Sandbox",
      description: "User-controlled sandbox",
      seed: 0,
      symbol: s.symbol,
      timeframe: s.timeframe,
      initialMidPrice: s.bookConfig.midPrice,
      seedSpread: s.bookConfig.spread,
      seedLevels: s.bookConfig.levels,
      seedQtyPerLevel: s.bookConfig.defaultQty,
      generators: [],
    }),
    [s.symbol, s.timeframe, s.bookConfig.midPrice, s.bookConfig.spread, s.bookConfig.levels, s.bookConfig.defaultQty],
  );

  return {
    bookSnapshot: s.bookSnapshot,
    recentTrades: s.recentTrades,
    closedCandles: s.closedCandles,
    currentCandle: s.currentCandle,
    tradeLog: s.tradeLog,
    studentPosition: s.activePosition,
    studentTrades: s.activeStudentTrades,
    studentOpenOrders: s.activeOpenOrders,
    submitOrder: s.submitOrder,
    cancelOrder: s.cancelOrder,
    cancelAllOrders: s.cancelAllOrders,
    flattenPosition: s.flattenPosition,
    ticketPrice: s.ticketPrice,
    ticketSide: s.ticketSide,
    setTicketPrice: s.setTicketPrice,
    clearTicketPrice: s.clearTicketPrice,
    quickOrder: s.quickOrder,
    openQuickOrder: s.openQuickOrder,
    closeQuickOrder: s.closeQuickOrder,
    isRunning: s.isRunning,
    speed: s.speed,
    start: s.start,
    pause: s.pause,
    step: s.step,
    setSpeed: s.setSpeed,
    chartType: s.chartType,
    chartTimeframe: s.chartTimeframe,
    renkoBrickSize: s.renkoBrickSize,
    pfBoxSize: s.pfBoxSize,
    pfReversal: s.pfReversal,
    setChartType: s.setChartType,
    setChartTimeframe: s.setChartTimeframe,
    setRenkoBrickSize: s.setRenkoBrickSize,
    setPfBoxSize: s.setPfBoxSize,
    setPfReversal: s.setPfReversal,
    scenario,
    dataSource: "fake",
    isReadOnly: false,
  };
}
