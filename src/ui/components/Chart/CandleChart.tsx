import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useSimulationStore } from "@state/simulation-store";

export function CandleChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const breakevenLineRef = useRef<IPriceLine | null>(null);

  const closedCandles = useSimulationStore((s) => s.closedCandles);
  const currentCandle = useSimulationStore((s) => s.currentCandle);
  const position = useSimulationStore((s) => s.studentPosition);

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
      crosshair: { mode: 0 },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
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
    const data: CandlestickData<UTCTimestamp>[] = closedCandles.map((c) => ({
      time: (c.timestamp / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    if (currentCandle) {
      data.push({
        time: (currentCandle.timestamp / 1000) as UTCTimestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
      });
    }
    series.setData(data);
  }, [closedCandles, currentCandle]);

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
