import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  ColorType,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { RenkoStream } from "@core/charts";
import { useSimulationStore } from "@state/simulation-store";

export function RenkoChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const tradeLog = useSimulationStore((s) => s.tradeLog);
  const brickSize = useSimulationStore((s) => s.renkoBrickSize);

  const bricks = useMemo(() => {
    const stream = new RenkoStream(brickSize);
    for (const t of tradeLog) stream.feed(t.price);
    return stream.bricks;
  }, [tradeLog, brickSize]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a3a3a3",
      },
      grid: { vertLines: { color: "#1f1f1f" }, horzLines: { color: "#1f1f1f" } },
      timeScale: {
        borderColor: "#262626",
        tickMarkFormatter: (time: number) => `#${time}`,
      },
      rightPriceScale: { borderColor: "#262626" },
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
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const data: CandlestickData<UTCTimestamp>[] = bricks.map((b) => ({
      time: (b.index + 1) as UTCTimestamp,
      open: b.openPrice,
      high: Math.max(b.openPrice, b.closePrice),
      low: Math.min(b.openPrice, b.closePrice),
      close: b.closePrice,
    }));
    series.setData(data);
  }, [bricks]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute top-2 left-2 text-[10px] text-neutral-500 bg-neutral-900/80 px-2 py-0.5 rounded">
        {bricks.length} bricks · size {brickSize}
      </div>
    </div>
  );
}
