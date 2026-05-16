import { useRef, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { BUILTIN_SCENARIOS, useSimulationStore } from "@state/simulation-store";
import { downloadScenario, readScenarioFromFile } from "../../../scenarios/storage";

export function ScenarioPanel() {
  const { t } = useTranslation();
  const scenario = useSimulationStore((s) => s.scenario);
  const customScenarios = useSimulationStore((s) => s.customScenarios);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const resetScenario = useSimulationStore((s) => s.resetScenario);
  const importScenario = useSimulationStore((s) => s.importScenario);
  const deleteCustomScenario = useSimulationStore((s) => s.deleteCustomScenario);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!scenario) return;
    downloadScenario(scenario);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readScenarioFromFile(file);
      importScenario(imported);
      loadScenario(imported);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`${t("scenario.importError")}: ${msg}`);
    } finally {
      e.target.value = "";
    }
  };

  const isCustom = scenario ? customScenarios.some((s) => s.id === scenario.id) : false;

  return (
    <div className="flex flex-col p-3 gap-3 text-xs h-full overflow-y-auto">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("scenario.title")}
      </h2>

      <select
        value={scenario?.id ?? ""}
        onChange={(e) => loadScenario(e.target.value)}
        className="w-full px-2 py-1.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700"
      >
        <optgroup label={t("scenario.builtin") ?? ""}>
          {BUILTIN_SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
        {customScenarios.length > 0 && (
          <optgroup label={t("scenario.custom") ?? ""}>
            {customScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {scenario && (
        <p className="text-neutral-400 leading-relaxed">{scenario.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-1">
        <PanelBtn onClick={resetScenario}>{t("scenario.reset")}</PanelBtn>
        <PanelBtn onClick={handleExport} disabled={!scenario}>
          {t("scenario.export")}
        </PanelBtn>
        <PanelBtn onClick={handleImportClick} className="col-span-2">
          {t("scenario.import")}
        </PanelBtn>
        {isCustom && scenario && (
          <PanelBtn
            onClick={() => deleteCustomScenario(scenario.id)}
            className="col-span-2 !bg-red-900/40 hover:!bg-red-900/60"
          >
            {t("scenario.deleteCustom")}
          </PanelBtn>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        hidden
        accept=".json,application/json"
        onChange={handleFile}
      />

      {scenario && (
        <div className="mt-2 pt-3 border-t border-neutral-800 text-neutral-500 space-y-1">
          <Meta label={t("scenario.seed")} value={String(scenario.seed)} />
          <Meta label={t("scenario.timeframe")} value={scenario.timeframe} />
          <Meta
            label={t("scenario.symbol")}
            value={`${scenario.symbol.base}/${scenario.symbol.quote}`}
          />
          <Meta label={t("scenario.generators")} value={String(scenario.generators.length)} />
        </div>
      )}
    </div>
  );
}

function PanelBtn({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="text-neutral-300">{value}</span>
    </div>
  );
}
