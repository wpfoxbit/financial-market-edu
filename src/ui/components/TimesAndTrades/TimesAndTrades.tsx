import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSimulation } from "../../../ui/context/simulation-context";

export function TimesAndTrades() {
  const { t } = useTranslation();
  const sim = useSimulation();
  const trades = sim.recentTrades;
  const studentTrades = sim.studentTrades;
  const setTicketPrice = sim.setTicketPrice;

  const handleRowClick = useCallback(
    (price: number) => setTicketPrice(price),
    [setTicketPrice],
  );

  const studentTradeIds = useMemo(
    () => new Set(studentTrades.map((st) => st.id)),
    [studentTrades],
  );

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
          {trades.map((tr) => {
            const isYours = studentTradeIds.has(tr.id);
            const sideColor = tr.aggressorSide === "buy" ? "text-emerald-400" : "text-red-400";
            const rowBg = isYours
              ? "bg-amber-500/15 hover:bg-amber-500/25 border-l-2 border-amber-500"
              : "hover:bg-neutral-800/40";
            return (
              <div
                key={tr.id}
                className={`grid grid-cols-3 px-2 py-0.5 cursor-pointer ${rowBg} ${sideColor}`}
                title={isYours ? "Your trade" : undefined}
                onClick={() => handleRowClick(tr.price)}
              >
                <span className="text-neutral-400">{formatTime(tr.timestamp)}</span>
                <span className="text-right tabular-nums">{tr.price.toFixed(2)}</span>
                <span className="text-right tabular-nums">
                  {tr.qty.toFixed(2)}
                  {isYours && <span className="ml-1 text-amber-300 text-[10px]">•</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
