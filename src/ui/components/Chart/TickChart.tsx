import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { useSimulation } from "../../../ui/context/simulation-context";

/**
 * Tick chart — plots every trade as a data point. Unlike candle/line charts
 * that aggregate by timeframe, this moves on every execution regardless of
 * clock speed. Ideal for sandbox mode where trades happen on-demand.
 *
 * Each trade gets a sequential timestamp so the x-axis advances per trade,
 * not per wall-clock second.
 */
export function TickChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const breakevenLineRef = useRef<IPriceLine | null>(null);

  const sim = useSimulation();
  const recentTrades = sim.recentTrades;
  const position = sim.studentPosition;

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a3a3a3",
      },
      grid: {
        vertLines: { color: "#1f1f1f" },
        horzLines: { color: "#1f1f1f" },
      },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: "#262626" },
      rightPriceScale: { borderColor: "#262626" },
      autoSize: true,
    });
    const series = chart.addLineSeries({
      color: "#a78bfa",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      breakevenLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    // recentTrades is newest-first; reverse to get chronological order.
    // Deduplicate by timestamp to avoid lightweight-charts errors.
    const chronological = [...recentTrades].reverse();
    const seen = new Set<number>();
    const data: LineData<UTCTimestamp>[] = [];

    for (const tr of chronological) {
      // Use the trade's real timestamp (seconds). If duplicate second,
      // bump by 1ms to keep series monotonic.
      let ts = Math.floor(tr.timestamp / 1000);
      while (seen.has(ts)) ts++;
      seen.add(ts);
      data.push({ time: ts as UTCTimestamp, value: tr.price });
    }

    series.setData(data);
  }, [recentTrades]);

  // Breakeven price line
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (position.netQty === 0) {
      if (breakevenLineRef.current) {
        series.removePriceLine(breakevenLineRef.current);
        breakevenLineRef.current = null;
      }
      return;
    }
    const opts = {
      price: position.avgEntryPrice,
      color: "#fbbf24",
      lineWidth: 1 as const,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `BE ${position.netQty > 0 ? "↑" : "↓"} ${Math.abs(position.netQty).toFixed(2)}`,
    };
    if (breakevenLineRef.current) breakevenLineRef.current.applyOptions(opts);
    else breakevenLineRef.current = series.createPriceLine(opts);
  }, [position.netQty, position.avgEntryPrice]);

  return <div ref={containerRef} className="h-full w-full" />;
}
