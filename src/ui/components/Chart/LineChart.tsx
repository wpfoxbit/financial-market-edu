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

export function LineChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const breakevenLineRef = useRef<IPriceLine | null>(null);

  const sim = useSimulation();
  const closedCandles = sim.closedCandles;
  const currentCandle = sim.currentCandle;
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
    const series = chart.addAreaSeries({
      lineColor: "#38bdf8",
      topColor: "rgba(56, 189, 248, 0.4)",
      bottomColor: "rgba(56, 189, 248, 0)",
      lineWidth: 2,
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
    const data: LineData<UTCTimestamp>[] = closedCandles.map((c) => ({
      time: (c.timestamp / 1000) as UTCTimestamp,
      value: c.close,
    }));
    if (currentCandle) {
      data.push({
        time: (currentCandle.timestamp / 1000) as UTCTimestamp,
        value: currentCandle.close,
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
