import { useSimulationStore } from "@state/simulation-store";
import { ChartHeader } from "./ChartHeader";
import { CandleChart } from "./CandleChart";
import { LineChart } from "./LineChart";
import { RenkoChart } from "./RenkoChart";
import { PFChart } from "./PFChart";

export function Chart() {
  const chartType = useSimulationStore((s) => s.chartType);

  return (
    <div className="flex flex-col h-full">
      <ChartHeader />
      <div className="flex-1 min-h-0">
        {chartType === "candle" && <CandleChart />}
        {chartType === "line" && <LineChart />}
        {chartType === "renko" && <RenkoChart />}
        {chartType === "pf" && <PFChart />}
      </div>
    </div>
  );
}
