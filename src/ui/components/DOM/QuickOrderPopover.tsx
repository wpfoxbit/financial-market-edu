import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimulation } from "../../../ui/context/simulation-context";

export function QuickOrderPopover() {
  const { t } = useTranslation();
  const sim = useSimulation();
  const quickOrder = sim.quickOrder;
  const close = sim.closeQuickOrder;
  const submit = sim.submitOrder;
  const scenario = sim.scenario;

  const qtyStep = scenario?.symbol.qtyStep ?? 0.01;
  const [qty, setQty] = useState(Math.max(qtyStep, 1));
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset qty when popover opens at a new price.
  useEffect(() => {
    if (quickOrder) {
      setQty(Math.max(qtyStep, 1));
      setError(null);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [quickOrder, qtyStep]);

  // Escape key and click-outside to dismiss.
  useEffect(() => {
    if (!quickOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [quickOrder, close]);

  if (!quickOrder) return null;

  const { price, side, x, y } = quickOrder;
  const isBuy = side === "buy";

  // Clamp popover position so it stays in viewport.
  const pw = 220;
  const ph = 160;
  const left = Math.min(x, window.innerWidth - pw - 8);
  const top = Math.min(y, window.innerHeight - ph - 8);

  const handleSubmit = () => {
    setError(null);
    const result = submit({ side, type: "limit", price, qty });
    if (result.ok) {
      close();
    } else {
      setError(result.error);
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col gap-2 p-3 rounded-lg shadow-xl border text-xs font-mono bg-neutral-900 border-neutral-700"
      style={{ left, top, width: pw }}
    >
      <div className="flex items-center justify-between">
        <span className="text-neutral-400 uppercase tracking-wider text-[10px]">
          {t("quickOrder.title")}
        </span>
        <span
          className={`font-semibold ${isBuy ? "text-emerald-400" : "text-red-400"}`}
        >
          {isBuy ? t("ticket.buy") : t("ticket.sell")} @ {price.toFixed(2)}
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-neutral-500">{t("quickOrder.qty")}</span>
        <input
          ref={inputRef}
          type="number"
          step={qtyStep}
          min={qtyStep}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          className="px-2 py-1.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700 tabular-nums"
        />
      </label>

      {error && <div className="text-red-400">{error}</div>}

      <div className="flex gap-1">
        <button
          onClick={handleSubmit}
          disabled={qty <= 0}
          className={`flex-1 px-2 py-1.5 rounded font-semibold text-white disabled:opacity-50 ${
            isBuy ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {t("quickOrder.submit")}
        </button>
        <button
          onClick={close}
          className="px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
        >
          {t("quickOrder.cancel")}
        </button>
      </div>
    </div>
  );
}
