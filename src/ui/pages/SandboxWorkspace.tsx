import { useEffect, useRef } from "react";
import { useSandboxStore } from "@state/sandbox-store";
import { SimulationProvider } from "../context/simulation-context";
import { useSandboxAdapter } from "../context/use-sandbox-adapter";
import { Chart } from "../components/Chart/Chart";
import { DOM } from "../components/DOM/DOM";
import { TimesAndTrades } from "../components/TimesAndTrades/TimesAndTrades";
import { Controls } from "../components/Controls/Controls";
import { OrderTicket } from "../components/OrderTicket/OrderTicket";
import { PositionPanel } from "../components/PositionPanel/PositionPanel";
import { StudentOrders } from "../components/StudentOrders/StudentOrders";
import { QuickOrderPopover } from "../components/DOM/QuickOrderPopover";
import { AccountManager } from "../components/AccountManager/AccountManager";
import { BookSetup } from "../components/BookSetup/BookSetup";
import { BulkOrderPanel } from "../components/BulkOrderPanel/BulkOrderPanel";
import { BotConfig } from "../components/BotConfig/BotConfig";

export function SandboxWorkspace() {
  const initSandbox = useSandboxStore((s) => s.initSandbox);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initSandbox();
  }, [initSandbox]);

  const adapter = useSandboxAdapter();

  return (
    <SimulationProvider value={adapter}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-[280px_1fr_260px_260px] min-h-0">
          <aside className="border-r border-neutral-800 min-h-0 overflow-y-auto flex flex-col gap-0">
            <BookSetup />
            <div className="border-t border-neutral-800" />
            <AccountManager />
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
        <div className="h-[340px] grid grid-cols-[280px_320px_1fr] border-t border-neutral-800 min-h-0">
          <aside className="border-r border-neutral-800 min-h-0 overflow-y-auto flex flex-col gap-0">
            <BulkOrderPanel />
            <div className="border-t border-neutral-800" />
            <BotConfig />
          </aside>
          <section className="border-r border-neutral-800 min-h-0 overflow-y-auto flex flex-col gap-0">
            <OrderTicket />
            <div className="border-t border-neutral-800" />
            <PositionPanel />
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
