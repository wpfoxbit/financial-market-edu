import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@state/simulation-store";
import { unrealizedPnl } from "@core/pnl";
import { avgSlippage } from "@core/pnl";

export function PositionPanel() {
  const { t } = useTranslation();
  const pos = useSimulationStore((s) => s.studentPosition);
  const trades = useSimulationStore((s) => s.studentTrades);
  const bookSnapshot = useSimulationStore((s) => s.bookSnapshot);

  const mid =
    bookSnapshot?.bids[0] && bookSnapshot?.asks[0]
      ? (bookSnapshot.bids[0].price + bookSnapshot.asks[0].price) / 2
      : pos.avgEntryPrice;

  const unrealized = unrealizedPnl(pos, mid);
  const total = pos.realizedPnl + unrealized;
  const slippage = avgSlippage(trades);

  const isFlat = pos.netQty === 0;
  const isLong = pos.netQty > 0;

  return (
    <div className="flex flex-col h-full p-3 gap-2 text-xs">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("position.title")}
      </h2>

      <Stat
        label={t("position.netQty")}
        value={isFlat ? "—" : pos.netQty.toFixed(4)}
        tone={isFlat ? "neutral" : isLong ? "positive" : "negative"}
      />
      <Stat
        label={t("position.avgEntry")}
        value={isFlat ? "—" : pos.avgEntryPrice.toFixed(2)}
      />
      <Stat
        label={t("position.realized")}
        value={pos.realizedPnl.toFixed(2)}
        tone={pos.realizedPnl > 0 ? "positive" : pos.realizedPnl < 0 ? "negative" : "neutral"}
      />
      <Stat
        label={t("position.unrealized")}
        value={isFlat ? "0.00" : unrealized.toFixed(2)}
        tone={unrealized > 0 ? "positive" : unrealized < 0 ? "negative" : "neutral"}
      />
      <Stat
        label={t("position.total")}
        value={total.toFixed(2)}
        tone={total > 0 ? "positive" : total < 0 ? "negative" : "neutral"}
        bold
      />
      <div className="pt-2 mt-1 border-t border-neutral-800 space-y-1.5">
        <Stat label={t("position.trades")} value={String(pos.tradeCount)} />
        <Stat
          label={t("position.avgSlippage")}
          value={slippage.toFixed(2)}
          tone={slippage > 0 ? "negative" : slippage < 0 ? "positive" : "neutral"}
        />
        <Stat label={t("position.bought")} value={pos.totalBought.toFixed(4)} />
        <Stat label={t("position.sold")} value={pos.totalSold.toFixed(4)} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  bold?: boolean;
}) {
  const color =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-neutral-200";
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-neutral-500">{label}</span>
      <span className={`tabular-nums ${color} ${bold ? "font-semibold text-sm" : ""}`}>
        {value}
      </span>
    </div>
  );
}
