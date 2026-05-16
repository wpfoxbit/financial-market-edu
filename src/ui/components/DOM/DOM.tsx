import { useTranslation } from "react-i18next";
import type { Level } from "@core/types";
import { useSimulationStore } from "@state/simulation-store";

export function DOM() {
  const { t } = useTranslation();
  const snap = useSimulationStore((s) => s.bookSnapshot);

  if (!snap || (snap.asks.length === 0 && snap.bids.length === 0)) {
    return <div className="p-4 text-xs text-neutral-500">{t("dom.empty")}</div>;
  }

  // Asks rendered top-down (highest first → best ask sits just above spread).
  const askLevels = [...snap.asks].reverse();
  const bidLevels = snap.bids;
  const maxQty = Math.max(
    1e-6,
    ...askLevels.map((l) => l.qty),
    ...bidLevels.map((l) => l.qty),
  );
  const spread =
    snap.asks[0] && snap.bids[0] ? (snap.asks[0].price - snap.bids[0].price).toFixed(2) : "-";

  return (
    <div className="flex flex-col text-xs font-mono">
      <div className="grid grid-cols-3 px-2 py-1 text-neutral-500 border-b border-neutral-800">
        <span>{t("dom.qty")}</span>
        <span className="text-right">{t("dom.price")}</span>
        <span className="text-right">{t("dom.qty")}</span>
      </div>
      {askLevels.map((l) => (
        <Row key={`ask-${l.price}`} level={l} side="sell" maxQty={maxQty} />
      ))}
      <div className="px-2 py-1 text-center text-neutral-500 bg-neutral-900 border-y border-neutral-800">
        {t("dom.spread")}: <span className="text-neutral-300">{spread}</span>
      </div>
      {bidLevels.map((l) => (
        <Row key={`bid-${l.price}`} level={l} side="buy" maxQty={maxQty} />
      ))}
    </div>
  );
}

interface RowProps {
  level: Level;
  side: "buy" | "sell";
  maxQty: number;
}

function Row({ level, side, maxQty }: RowProps) {
  const pct = (level.qty / maxQty) * 100;
  const isAsk = side === "sell";
  return (
    <div className="relative grid grid-cols-3 px-2 py-0.5 hover:bg-neutral-800/40">
      <div
        className={`absolute inset-y-0 ${isAsk ? "right-1/2 bg-red-500/20" : "left-1/2 bg-emerald-500/20"}`}
        style={{ width: `${pct / 2}%` }}
        aria-hidden
      />
      <span className="relative text-left text-neutral-300">
        {isAsk ? level.qty.toFixed(2) : ""}
      </span>
      <span
        className={`relative text-right tabular-nums ${isAsk ? "text-red-400" : "text-emerald-400"}`}
      >
        {level.price.toFixed(2)}
      </span>
      <span className="relative text-right text-neutral-300">
        {!isAsk ? level.qty.toFixed(2) : ""}
      </span>
    </div>
  );
}
