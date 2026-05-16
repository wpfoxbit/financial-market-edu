import { useTranslation } from "react-i18next";
import { useSandboxStore } from "@state/sandbox-store";

export function BookSetup() {
  const { t } = useTranslation();
  const bookConfig = useSandboxStore((s) => s.bookConfig);
  const updateBookConfig = useSandboxStore((s) => s.updateBookConfig);
  const initSandbox = useSandboxStore((s) => s.initSandbox);
  const engine = useSandboxStore((s) => s.engine);

  return (
    <div className="flex flex-col gap-2 p-3 text-xs">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("sandbox.bookSetup")}
      </h2>

      <NumField
        label={t("sandbox.midPrice")}
        value={bookConfig.midPrice}
        onChange={(v) => updateBookConfig({ midPrice: v })}
        step={0.5}
      />
      <NumField
        label={t("sandbox.spread")}
        value={bookConfig.spread}
        onChange={(v) => updateBookConfig({ spread: Math.max(0, v) })}
        step={0.5}
      />
      <NumField
        label={t("sandbox.levels")}
        value={bookConfig.levels}
        onChange={(v) => updateBookConfig({ levels: Math.max(2, Math.round(v)) })}
        step={2}
      />
      <NumField
        label={t("sandbox.defaultQty")}
        value={bookConfig.defaultQty}
        onChange={(v) => updateBookConfig({ defaultQty: Math.max(0, v) })}
        step={0.01}
      />
      <NumField
        label={t("sandbox.tickSize")}
        value={bookConfig.tickSize}
        onChange={(v) => updateBookConfig({ tickSize: Math.max(0.01, v) })}
        step={0.01}
      />

      <button
        onClick={initSandbox}
        className="mt-1 px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
      >
        {engine ? t("sandbox.resetBook") : t("sandbox.initBook")}
      </button>

      {bookConfig.customVolumes.size > 0 && (
        <div className="text-neutral-500 text-[10px]">
          {t("sandbox.customLevels")}: {bookConfig.customVolumes.size}
        </div>
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
