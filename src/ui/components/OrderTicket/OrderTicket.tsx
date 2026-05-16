import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@state/simulation-store";
import type { OrderType, Side } from "@core/types";

export function OrderTicket() {
  const { t } = useTranslation();
  const scenario = useSimulationStore((s) => s.scenario);
  const bookSnapshot = useSimulationStore((s) => s.bookSnapshot);
  const submit = useSimulationStore((s) => s.submitStudentOrder);
  const dataSource = useSimulationStore((s) => s.dataSource);
  const isReadOnly = dataSource !== "fake";

  const tickSize = scenario?.symbol.tickSize ?? 0.5;
  const qtyStep = scenario?.symbol.qtyStep ?? 0.01;

  const [type, setType] = useState<OrderType>("limit");
  const [side, setSide] = useState<Side>("buy");
  const defaultPrice = bookSnapshot?.bids[0]?.price ?? scenario?.initialMidPrice ?? 0;
  const [price, setPrice] = useState<number>(defaultPrice);
  const [qty, setQty] = useState<number>(Math.max(qtyStep, 1));
  const [error, setError] = useState<string | null>(null);

  // Sync default price when book first arrives or symbol changes.
  useEffect(() => {
    if (bookSnapshot && Number.isFinite(defaultPrice) && price === 0) {
      setPrice(defaultPrice);
    }
  }, [defaultPrice, bookSnapshot, price]);

  // Re-clamp price/qty whenever scenario changes.
  useEffect(() => {
    setPrice((p) => Math.round(p / tickSize) * tickSize);
    setQty((q) => Math.max(qtyStep, Math.round(q / qtyStep) * qtyStep));
  }, [tickSize, qtyStep]);

  const handleSubmit = () => {
    setError(null);
    const result = submit({ side, type, price, qty });
    if (!result.ok) setError(result.error);
  };

  if (isReadOnly) {
    return (
      <div className="flex flex-col h-full p-3 gap-3 text-xs">
        <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
          {t("ticket.title")}
        </h2>
        <div className="flex-1 flex items-center justify-center text-center text-neutral-500 leading-relaxed">
          {t("ticket.disabledRealMode")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-3 gap-2 text-xs">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("ticket.title")}
      </h2>

      <div className="grid grid-cols-2 gap-1">
        <SideBtn active={side === "buy"} variant="buy" onClick={() => setSide("buy")}>
          {t("ticket.buy")}
        </SideBtn>
        <SideBtn active={side === "sell"} variant="sell" onClick={() => setSide("sell")}>
          {t("ticket.sell")}
        </SideBtn>
      </div>

      <div className="flex gap-1">
        <TypeBtn active={type === "limit"} onClick={() => setType("limit")}>
          {t("ticket.limit")}
        </TypeBtn>
        <TypeBtn active={type === "market"} onClick={() => setType("market")}>
          {t("ticket.market")}
        </TypeBtn>
      </div>

      <Field
        label={t("ticket.price")}
        value={price}
        step={tickSize}
        disabled={type === "market"}
        onChange={setPrice}
      />
      <Field label={t("ticket.qty")} value={qty} step={qtyStep} onChange={setQty} />

      <button
        className={`mt-1 px-3 py-2 rounded font-semibold text-white ${
          side === "buy"
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-red-600 hover:bg-red-500"
        } disabled:opacity-50`}
        onClick={handleSubmit}
        disabled={!scenario || qty <= 0}
      >
        {side === "buy" ? t("ticket.submitBuy") : t("ticket.submitSell")}{" "}
        <span className="text-white/70">·</span> {type === "market" ? "MKT" : "LIM"}
      </button>

      {error && <div className="text-red-400 mt-1">{error}</div>}
    </div>
  );
}

function SideBtn({
  active,
  variant,
  onClick,
  children,
}: {
  active: boolean;
  variant: "buy" | "sell";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const palette =
    variant === "buy"
      ? active
        ? "bg-emerald-600 text-white"
        : "bg-neutral-800 hover:bg-emerald-900/40 text-emerald-300"
      : active
        ? "bg-red-600 text-white"
        : "bg-neutral-800 hover:bg-red-900/40 text-red-300";
  return (
    <button onClick={onClick} className={`px-2 py-1.5 rounded font-medium ${palette}`}>
      {children}
    </button>
  );
}

function TypeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-1 rounded ${
        active ? "bg-neutral-700 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-neutral-500">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2 py-1.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700 tabular-nums disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </label>
  );
}
