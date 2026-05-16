import { useSimulation } from "../../../ui/context/simulation-context";
import { ChartHeader } from "./ChartHeader";
import { CandleChart } from "./CandleChart";
import { LineChart } from "./LineChart";
import { TickChart } from "./TickChart";
import { RenkoChart } from "./RenkoChart";
import { PFChart } from "./PFChart";

export function Chart() {
  const { chartType } = useSimulation();

  return (
    <div className="flex flex-col h-full">
      <ChartHeader />
      <div className="flex-1 min-h-0">
        {chartType === "candle" && <CandleChart />}
        {chartType === "line" && <LineChart />}
        {chartType === "tick" && <TickChart />}
        {chartType === "renko" && <RenkoChart />}
        {chartType === "pf" && <PFChart />}
      </div>
    </div>
  );
}
