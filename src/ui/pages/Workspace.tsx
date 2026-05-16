import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@state/simulation-store";
import { Chart } from "../components/Chart/Chart";
import { DOM } from "../components/DOM/DOM";
import { TimesAndTrades } from "../components/TimesAndTrades/TimesAndTrades";
import { Controls } from "../components/Controls/Controls";
import { ScenarioPanel } from "../components/ScenarioPanel/ScenarioPanel";
import { OrderTicket } from "../components/OrderTicket/OrderTicket";
import { PositionPanel } from "../components/PositionPanel/PositionPanel";
import { StudentOrders } from "../components/StudentOrders/StudentOrders";
import { AssetManager } from "../components/AssetManager/AssetManager";

export function Workspace() {
  const { t, i18n } = useTranslation();
  const bootstrap = useSimulationStore((s) => s.bootstrap);
  const scenario = useSimulationStore((s) => s.scenario);
  const dataSource = useSimulationStore((s) => s.dataSource);
  const realSymbol = useSimulationStore((s) => s.realSymbol);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    bootstrap();
  }, [bootstrap]);

  const headerSubtitle =
    dataSource === "fake"
      ? scenario
        ? `${scenario.symbol.base}/${scenario.symbol.quote} (${t("app.fakeBadge")}) — ${scenario.name}`
        : null
      : `${realSymbol?.toUpperCase()} (LIVE · ${dataSource.toUpperCase()})`;

  return (
    <div className="flex flex-col h-screen text-neutral-100 bg-neutral-950">
      <header className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">{t("app.title")}</h1>
          {headerSubtitle && (
            <span className="text-xs text-neutral-400">{headerSubtitle}</span>
          )}
        </div>
        <div className="flex gap-1 text-xs">
          <LangBtn onClick={() => i18n.changeLanguage("en")} active={i18n.language === "en"}>
            EN
          </LangBtn>
          <LangBtn
            onClick={() => i18n.changeLanguage("pt-BR")}
            active={i18n.language === "pt-BR"}
          >
            PT
          </LangBtn>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-[240px_1fr_260px_260px] min-h-0">
          <aside className="border-r border-neutral-800 min-h-0 overflow-hidden flex flex-col">
            <AssetManager />
            <div className="flex-1 overflow-hidden">
              <ScenarioPanel />
            </div>
          </aside>
          <section className="border-r border-neutral-800 min-h-0">
            <Chart />
          </section>
          <section className="border-r border-neutral-800 min-h-0 overflow-y-auto">
            <DOM />
          </section>
          <section className="min-h-0 overflow-hidden flex flex-col">
            <TimesAndTrades />
          </section>
        </div>
        <div className="h-[230px] grid grid-cols-[240px_320px_1fr] border-t border-neutral-800 min-h-0">
          <aside className="border-r border-neutral-800 min-h-0 overflow-hidden">
            <PositionPanel />
          </aside>
          <section className="border-r border-neutral-800 min-h-0 overflow-hidden">
            <OrderTicket />
          </section>
          <section className="min-h-0 overflow-hidden">
            <StudentOrders />
          </section>
        </div>
      </main>

      <Controls />
    </div>
  );
}

function LangBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded ${
        active
          ? "bg-neutral-700 text-white"
          : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}
