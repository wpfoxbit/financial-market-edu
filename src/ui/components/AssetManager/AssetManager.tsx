import { useTranslation } from "react-i18next";
import { EXCHANGE_ADAPTERS, useSimulationStore } from "@state/simulation-store";
import { findAdapter } from "../../../adapters";

export function AssetManager() {
  const { t } = useTranslation();
  const dataSource = useSimulationStore((s) => s.dataSource);
  const realSymbol = useSimulationStore((s) => s.realSymbol);
  const adapterStatus = useSimulationStore((s) => s.adapterStatus);
  const setDataSource = useSimulationStore((s) => s.setDataSource);
  const setRealSymbol = useSimulationStore((s) => s.setRealSymbol);

  const adapter = dataSource !== "fake" ? findAdapter(dataSource) : null;
  const symbols = adapter?.symbols() ?? [];

  return (
    <div className="flex flex-col p-3 gap-2 text-xs border-b border-neutral-800">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("source.title")}
      </h2>

      <select
        value={dataSource}
        onChange={(e) => setDataSource(e.target.value)}
        className="w-full px-2 py-1.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700"
      >
        <option value="fake">{t("source.fake")}</option>
        <optgroup label={t("source.realExchanges") ?? ""}>
          {EXCHANGE_ADAPTERS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
            </option>
          ))}
        </optgroup>
      </select>

      {adapter && (
        <>
          <select
            value={realSymbol ?? ""}
            onChange={(e) => setRealSymbol(e.target.value)}
            className="w-full px-2 py-1.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
          <StatusBadge status={adapterStatus} />
          <p className="text-neutral-500 leading-relaxed">{t("source.readOnly")}</p>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  if (!status) return null;
  const color =
    status === "open"
      ? "bg-emerald-900/50 text-emerald-300 border-emerald-700/50"
      : status === "connecting"
        ? "bg-amber-900/50 text-amber-300 border-amber-700/50"
        : status === "error"
          ? "bg-red-900/50 text-red-300 border-red-700/50"
          : "bg-neutral-800 text-neutral-400 border-neutral-700";
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${color} w-fit`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {t(`source.status.${status}`)}
    </div>
  );
}
