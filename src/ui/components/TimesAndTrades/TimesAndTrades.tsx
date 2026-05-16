import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@state/simulation-store";

export function TimesAndTrades() {
  const { t } = useTranslation();
  const trades = useSimulationStore((s) => s.recentTrades);

  return (
    <div className="flex flex-col text-xs font-mono h-full">
      <div className="grid grid-cols-3 px-2 py-1 text-neutral-500 border-b border-neutral-800">
        <span>{t("tt.time")}</span>
        <span className="text-right">{t("tt.price")}</span>
        <span className="text-right">{t("tt.qty")}</span>
      </div>
      {trades.length === 0 ? (
        <div className="p-4 text-neutral-500">{t("tt.empty")}</div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {trades.map((tr) => (
            <div
              key={tr.id}
              className={`grid grid-cols-3 px-2 py-0.5 hover:bg-neutral-800/40 ${
                tr.aggressorSide === "buy" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              <span className="text-neutral-400">{formatTime(tr.timestamp)}</span>
              <span className="text-right tabular-nums">{tr.price.toFixed(2)}</span>
              <span className="text-right tabular-nums">{tr.qty.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
