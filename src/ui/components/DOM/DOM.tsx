import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Level, Side } from "@core/types";
import { useSimulation } from "../../../ui/context/simulation-context";

export function DOM() {
  const { t } = useTranslation();
  const sim = useSimulation();
  const snap = sim.bookSnapshot;
  const openOrders = sim.studentOpenOrders;
  const setTicketPrice = sim.setTicketPrice;
  const openQuickOrder = sim.openQuickOrder;
  const dataSource = sim.dataSource;

  const handleRowClick = useCallback(
    (price: number, side: Side) => setTicketPrice(price, side),
    [setTicketPrice],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, price: number, side: Side) => {
      if (!e.shiftKey || dataSource !== "fake") return;
      e.preventDefault();
      openQuickOrder(price, side, e.clientX, e.clientY);
    },
    [openQuickOrder, dataSource],
  );

  const studentPrices = useMemo(() => {
    const bids = new Map<number, number>();
    const asks = new Map<number, number>();
    for (const o of openOrders) {
      const target = o.side === "buy" ? bids : asks;
      target.set(o.price, (target.get(o.price) ?? 0) + o.qty);
    }
    return { bids, asks };
  }, [openOrders]);

  if (!snap || (snap.asks.length === 0 && snap.bids.length === 0)) {
    return <div className="p-4 text-xs text-neutral-500">{t("dom.empty")}</div>;
  }

  // Asks rendered top-down (highest first → best ask sits just above spread).
  const askLevels = [...snap.asks].reverse();
  const bidLevels = snap.bids;
  const maxQty = Math.max(1e-6, ...askLevels.map((l) => l.qty), ...bidLevels.map((l) => l.qty));
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
        <Row
          key={`ask-${l.price}`}
          level={l}
          side="sell"
          maxQty={maxQty}
          yourQty={studentPrices.asks.get(l.price)}
          onClick={() => handleRowClick(l.price, "sell")}
          onContextMenu={(e) => handleContextMenu(e, l.price, "sell")}
        />
      ))}
      <div className="px-2 py-1 text-center text-neutral-500 bg-neutral-900 border-y border-neutral-800">
        {t("dom.spread")}: <span className="text-neutral-300">{spread}</span>
      </div>
      {bidLevels.map((l) => (
        <Row
          key={`bid-${l.price}`}
          level={l}
          side="buy"
          maxQty={maxQty}
          yourQty={studentPrices.bids.get(l.price)}
          onClick={() => handleRowClick(l.price, "buy")}
          onContextMenu={(e) => handleContextMenu(e, l.price, "buy")}
        />
      ))}
    </div>
  );
}

interface RowProps {
  level: Level;
  side: "buy" | "sell";
  maxQty: number;
  yourQty?: number;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function Row({ level, side, maxQty, yourQty, onClick, onContextMenu }: RowProps) {
  const pct = (level.qty / maxQty) * 100;
  const isAsk = side === "sell";
  const isYours = yourQty !== undefined && yourQty > 0;
  const rowBg = isYours ? "bg-amber-500/15 hover:bg-amber-500/25" : "hover:bg-neutral-800/40";
  return (
    <div
      className={`relative grid grid-cols-3 px-2 py-0.5 cursor-pointer ${rowBg} ${
        isYours ? "border-l-2 border-amber-500" : ""
      }`}
      title={isYours ? `Yours: ${yourQty!.toFixed(4)}` : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div
        className={`absolute inset-y-0 ${isAsk ? "right-1/2 bg-red-500/20" : "left-1/2 bg-emerald-500/20"}`}
        style={{ width: `${pct / 2}%` }}
        aria-hidden
      />
      <span className="relative text-left text-neutral-300">
        {isAsk ? formatQtyCell(level.qty, yourQty) : ""}
      </span>
      <span
        className={`relative text-right tabular-nums ${
          isYours ? "text-amber-300 font-semibold" : isAsk ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {level.price.toFixed(2)}
      </span>
      <span className="relative text-right text-neutral-300">
        {!isAsk ? formatQtyCell(level.qty, yourQty) : ""}
      </span>
    </div>
  );
}

function formatQtyCell(total: number, yours?: number): React.ReactNode {
  if (yours === undefined || yours <= 0) return total.toFixed(2);
  return (
    <span>
      {total.toFixed(2)}{" "}
      <span className="text-amber-300 text-[10px]">({yours.toFixed(2)})</span>
    </span>
  );
}
