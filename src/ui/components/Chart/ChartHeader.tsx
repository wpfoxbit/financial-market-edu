import { useTranslation } from "react-i18next";
import type { Timeframe } from "@core/types";
import type { ChartType } from "@state/simulation-store";
import { useSimulation } from "../../../ui/context/simulation-context";

const TIMEFRAMES: Timeframe[] = ["1s", "5s", "15s", "1m", "5m", "15m", "1h"];
const CHART_TYPES: ChartType[] = ["candle", "line", "tick", "renko", "pf"];

export function ChartHeader() {
  const { t } = useTranslation();
  const sim = useSimulation();
  const chartType = sim.chartType;
  const chartTimeframe = sim.chartTimeframe;
  const setChartType = sim.setChartType;
  const setChartTimeframe = sim.setChartTimeframe;
  const renkoBrickSize = sim.renkoBrickSize;
  const pfBoxSize = sim.pfBoxSize;
  const pfReversal = sim.pfReversal;
  const setRenko = sim.setRenkoBrickSize;
  const setBox = sim.setPfBoxSize;
  const setReversal = sim.setPfReversal;
  const tickSize = sim.scenario?.symbol.tickSize ?? 0.5;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 text-xs">
      <div className="flex gap-1">
        {CHART_TYPES.map((c) => (
          <Pill key={c} active={chartType === c} onClick={() => setChartType(c)}>
            {t(`chartType.${c}`)}
          </Pill>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {chartType === "renko" && (
          <Param
            label={t("chartParam.brickSize")}
            value={renkoBrickSize}
            step={tickSize}
            min={tickSize}
            onChange={setRenko}
          />
        )}
        {chartType === "pf" && (
          <>
            <Param
              label={t("chartParam.boxSize")}
              value={pfBoxSize}
              step={tickSize}
              min={tickSize}
              onChange={setBox}
            />
            <Param
              label={t("chartParam.reversal")}
              value={pfReversal}
              step={1}
              min={1}
              onChange={setReversal}
            />
          </>
        )}

        {(chartType === "candle" || chartType === "line") && (
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <Pill
                key={tf}
                active={chartTimeframe === tf}
                onClick={() => setChartTimeframe(tf)}
                small
              >
                {tf}
              </Pill>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1"} rounded ${
        active
          ? "bg-emerald-700 text-white"
          : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

function Param({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-neutral-500">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700"
      />
    </label>
  );
}
