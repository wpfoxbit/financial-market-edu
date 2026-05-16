import { useSimulationStore } from "@state/simulation-store";
import type { SimulationAdapter } from "./simulation-context";

/** Bridges useSimulationStore → SimulationAdapter for the main workspace. */
export function useMainAdapter(): SimulationAdapter {
  const s = useSimulationStore();
  return {
    bookSnapshot: s.bookSnapshot,
    recentTrades: s.recentTrades,
    closedCandles: s.closedCandles,
    currentCandle: s.currentCandle,
    tradeLog: s.tradeLog,
    studentPosition: s.studentPosition,
    studentTrades: s.studentTrades,
    studentOpenOrders: s.studentOpenOrders,
    submitOrder: s.submitStudentOrder,
    cancelOrder: s.cancelStudentOrder,
    cancelAllOrders: s.cancelAllStudentOrders,
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
    scenario: s.scenario,
    dataSource: s.dataSource,
    isReadOnly: s.dataSource !== "fake",
  };
}
