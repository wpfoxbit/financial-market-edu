import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@state/simulation-store";
import { SimulationProvider } from "../context/simulation-context";
import { useMainAdapter } from "../context/use-main-adapter";
import { Chart } from "../components/Chart/Chart";
import { DOM } from "../components/DOM/DOM";
import { TimesAndTrades } from "../components/TimesAndTrades/TimesAndTrades";
import { Controls } from "../components/Controls/Controls";
import { ScenarioPanel } from "../components/ScenarioPanel/ScenarioPanel";
import { OrderTicket } from "../components/OrderTicket/OrderTicket";
import { PositionPanel } from "../components/PositionPanel/PositionPanel";
import { StudentOrders } from "../components/StudentOrders/StudentOrders";
import { AssetManager } from "../components/AssetManager/AssetManager";
import { QuickOrderPopover } from "../components/DOM/QuickOrderPopover";

export function Workspace() {
  const { t } = useTranslation();
  const bootstrap = useSimulationStore((s) => s.bootstrap);
  const scenario = useSimulationStore((s) => s.scenario);
  const dataSource = useSimulationStore((s) => s.dataSource);
  const realSymbol = useSimulationStore((s) => s.realSymbol);
  const adapter = useMainAdapter();
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
    <SimulationProvider value={adapter}>
      {headerSubtitle && (
        <div className="px-4 py-1 text-xs text-neutral-400 border-b border-neutral-800">
          {headerSubtitle}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
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
        <div className="h-[300px] grid grid-cols-[240px_320px_1fr] border-t border-neutral-800 min-h-0">
          <aside className="border-r border-neutral-800 min-h-0 overflow-y-auto">
            <PositionPanel />
          </aside>
          <section className="border-r border-neutral-800 min-h-0 overflow-y-auto">
            <OrderTicket />
          </section>
          <section className="min-h-0 overflow-hidden">
            <StudentOrders />
          </section>
        </div>
      </div>
      <Controls />
      <QuickOrderPopover />
    </SimulationProvider>
  );
}
