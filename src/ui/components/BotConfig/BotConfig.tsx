import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSandboxStore } from "@state/sandbox-store";

export function BotConfig() {
  const { t } = useTranslation();
  const accounts = useSandboxStore((s) => s.accounts);
  const activeAccountId = useSandboxStore((s) => s.activeAccountId);
  const attachLiquidityBot = useSandboxStore((s) => s.attachLiquidityBot);
  const attachMarketBot = useSandboxStore((s) => s.attachMarketBot);
  const detachBot = useSandboxStore((s) => s.detachBot);
  const bookConfig = useSandboxStore((s) => s.bookConfig);

  const botAccounts = accounts.filter((a) => a.kind !== "manual");
  const [targetId, setTargetId] = useState<string>("");

  // Liquidity bot params
  const [liqSpread, setLiqSpread] = useState(2);
  const [liqLevels, setLiqLevels] = useState(10);
  const [liqQtyMean, setLiqQtyMean] = useState(1);
  const [liqQtyStdev, setLiqQtyStdev] = useState(0.3);
  const [liqRefresh, setLiqRefresh] = useState(0.15);

  // Market bot params
  const [mktLambda, setMktLambda] = useState(0.1);
  const [mktSizeMean, setMktSizeMean] = useState(1);
  const [mktSizeStdev, setMktSizeStdev] = useState(0.5);
  const [mktBias, setMktBias] = useState(0.5);

  const resolvedId = targetId || botAccounts[0]?.id || activeAccountId;
  const resolvedAccount = accounts.find((a) => a.id === resolvedId);

  const handleAttachLiquidity = () => {
    if (!resolvedId) return;
    attachLiquidityBot(resolvedId, {
      referencePrice: bookConfig.midPrice,
      targetSpread: liqSpread,
      targetLevels: liqLevels,
      qtyMean: liqQtyMean,
      qtyStdev: liqQtyStdev,
      refreshChance: liqRefresh,
    });
  };

  const handleAttachMarket = () => {
    if (!resolvedId) return;
    attachMarketBot(resolvedId, {
      lambda: mktLambda,
      sizeMean: mktSizeMean,
      sizeStdev: mktSizeStdev,
      sideBias: mktBias,
    });
  };

  return (
    <div className="flex flex-col gap-2 p-3 text-xs">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("sandbox.botConfig")}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-neutral-500">{t("sandbox.botAccount")}</span>
        <select
          value={resolvedId ?? ""}
          onChange={(e) => setTargetId(e.target.value)}
          className="px-2 py-1 bg-neutral-800 rounded text-neutral-100 border border-neutral-700"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.kind})
            </option>
          ))}
        </select>
      </label>

      {resolvedAccount?.kind === "liquidity-bot" && (
        <div className="flex flex-col gap-1 border-t border-neutral-800 pt-2">
          <span className="text-amber-400 text-[10px] uppercase tracking-wider">{t("sandbox.liquidityBot")}</span>
          <NumField label={t("sandbox.targetSpread")} value={liqSpread} onChange={setLiqSpread} step={0.5} />
          <NumField label={t("sandbox.targetLevels")} value={liqLevels} onChange={(v) => setLiqLevels(Math.max(1, Math.round(v)))} step={1} />
          <NumField label={t("sandbox.qtyMean")} value={liqQtyMean} onChange={setLiqQtyMean} step={0.1} />
          <NumField label={t("sandbox.qtyStdev")} value={liqQtyStdev} onChange={setLiqQtyStdev} step={0.1} />
          <NumField label={t("sandbox.refreshChance")} value={liqRefresh} onChange={setLiqRefresh} step={0.01} />
          <button onClick={handleAttachLiquidity} className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-medium">
            {t("sandbox.attachBot")}
          </button>
        </div>
      )}

      {resolvedAccount?.kind === "market-bot" && (
        <div className="flex flex-col gap-1 border-t border-neutral-800 pt-2">
          <span className="text-purple-400 text-[10px] uppercase tracking-wider">{t("sandbox.marketBot")}</span>
          <NumField label={t("sandbox.lambda")} value={mktLambda} onChange={setMktLambda} step={0.01} />
          <NumField label={t("sandbox.sizeMean")} value={mktSizeMean} onChange={setMktSizeMean} step={0.1} />
          <NumField label={t("sandbox.sizeStdev")} value={mktSizeStdev} onChange={setMktSizeStdev} step={0.1} />
          <NumField label={`${t("sandbox.sideBias")} (0=sell, 1=buy)`} value={mktBias} onChange={setMktBias} step={0.05} />
          <button onClick={handleAttachMarket} className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-medium">
            {t("sandbox.attachBot")}
          </button>
        </div>
      )}

      {resolvedId && (
        <button
          onClick={() => resolvedId && detachBot(resolvedId)}
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-red-900/40 text-neutral-300"
        >
          {t("sandbox.detachBot")}
        </button>
      )}
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
