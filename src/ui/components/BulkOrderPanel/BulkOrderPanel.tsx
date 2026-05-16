import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSandboxStore } from "@state/sandbox-store";
import type { Side } from "@core/types";

export function BulkOrderPanel() {
  const { t } = useTranslation();
  const accounts = useSandboxStore((s) => s.accounts);
  const activeAccountId = useSandboxStore((s) => s.activeAccountId);
  const submitBulkOrders = useSandboxStore((s) => s.submitBulkOrders);
  const bookConfig = useSandboxStore((s) => s.bookConfig);

  const [accountId, setAccountId] = useState<string>("");
  const [side, setSide] = useState<Side>("sell");
  const [startPrice, setStartPrice] = useState(bookConfig.midPrice + 1);
  const [endPrice, setEndPrice] = useState(bookConfig.midPrice + 10);
  const [count, setCount] = useState(10);
  const [qtyPerOrder, setQtyPerOrder] = useState(1);

  const targetId = accountId || activeAccountId;

  const handleSubmit = () => {
    if (!targetId) return;
    submitBulkOrders(targetId, { side, startPrice, endPrice, count, qtyPerOrder });
  };

  return (
    <div className="flex flex-col gap-2 p-3 text-xs">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("sandbox.bulkOrders")}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-neutral-500">{t("sandbox.account")}</span>
        <select
          value={targetId ?? ""}
          onChange={(e) => setAccountId(e.target.value)}
          className="px-2 py-1 bg-neutral-800 rounded text-neutral-100 border border-neutral-700"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-1">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 px-2 py-1 rounded font-medium ${
            side === "buy"
              ? "bg-emerald-600 text-white"
              : "bg-neutral-800 hover:bg-emerald-900/40 text-emerald-300"
          }`}
        >
          {t("ticket.buy")}
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 px-2 py-1 rounded font-medium ${
            side === "sell"
              ? "bg-red-600 text-white"
              : "bg-neutral-800 hover:bg-red-900/40 text-red-300"
          }`}
        >
          {t("ticket.sell")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <NumField label={t("sandbox.startPrice")} value={startPrice} onChange={setStartPrice} step={0.5} />
        <NumField label={t("sandbox.endPrice")} value={endPrice} onChange={setEndPrice} step={0.5} />
        <NumField label={t("sandbox.orderCount")} value={count} onChange={(v) => setCount(Math.max(1, Math.round(v)))} step={1} />
        <NumField label={t("sandbox.qtyPerOrder")} value={qtyPerOrder} onChange={setQtyPerOrder} step={0.01} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!targetId || count <= 0}
        className={`mt-1 px-3 py-2 rounded font-semibold text-white disabled:opacity-50 ${
          side === "buy" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
        }`}
      >
        {t("sandbox.placeBulk")} ({count})
      </button>
    </div>
  );
}

function NumField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-neutral-500 text-[10px]">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2 py-1 bg-neutral-800 rounded text-neutral-100 border border-neutral-700 tabular-nums"
      />
    </label>
  );
}
