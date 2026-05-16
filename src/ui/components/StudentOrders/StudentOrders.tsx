import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@state/simulation-store";

type Tab = "open" | "history";

export function StudentOrders() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("open");
  const openOrders = useSimulationStore((s) => s.studentOpenOrders);
  const trades = useSimulationStore((s) => s.studentTrades);
  const cancel = useSimulationStore((s) => s.cancelStudentOrder);

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex border-b border-neutral-800 px-3 pt-2 gap-2 text-[11px]">
        <TabBtn active={tab === "open"} onClick={() => setTab("open")}>
          {t("studentOrders.open")} ({openOrders.length})
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
          {t("studentOrders.history")} ({trades.length})
        </TabBtn>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "open" ? (
          openOrders.length === 0 ? (
            <Empty>{t("studentOrders.noOpen")}</Empty>
          ) : (
            <table className="w-full">
              <thead className="text-neutral-500 sticky top-0 bg-neutral-950">
                <tr>
                  <Th>{t("studentOrders.side")}</Th>
                  <Th>{t("studentOrders.type")}</Th>
                  <Th align="right">{t("studentOrders.price")}</Th>
                  <Th align="right">{t("studentOrders.qty")}</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {openOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-800/40">
                    <Td color={o.side === "buy" ? "emerald" : "red"}>
                      {o.side === "buy" ? t("ticket.buy") : t("ticket.sell")}
                    </Td>
                    <Td>{o.type === "limit" ? "LIM" : "MKT"}</Td>
                    <Td align="right">{o.price.toFixed(2)}</Td>
                    <Td align="right">{o.qty.toFixed(4)}</Td>
                    <Td align="right">
                      <button
                        onClick={() => cancel(o.id)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-red-900/40 text-neutral-300"
                      >
                        {t("studentOrders.cancel")}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : trades.length === 0 ? (
          <Empty>{t("studentOrders.noHistory")}</Empty>
        ) : (
          <table className="w-full">
            <thead className="text-neutral-500 sticky top-0 bg-neutral-950">
              <tr>
                <Th>{t("studentOrders.time")}</Th>
                <Th>{t("studentOrders.side")}</Th>
                <Th>{t("studentOrders.type")}</Th>
                <Th align="right">{t("studentOrders.price")}</Th>
                <Th align="right">{t("studentOrders.qty")}</Th>
                <Th align="right">{t("studentOrders.slippage")}</Th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {trades.map((tr) => (
                <tr key={tr.id} className="hover:bg-neutral-800/40">
                  <Td color="muted">{formatTime(tr.timestamp)}</Td>
                  <Td color={tr.side === "buy" ? "emerald" : "red"}>
                    {tr.side === "buy" ? t("ticket.buy") : t("ticket.sell")}
                  </Td>
                  <Td>{tr.orderType === "limit" ? "LIM" : "MKT"}</Td>
                  <Td align="right">{tr.price.toFixed(2)}</Td>
                  <Td align="right">{tr.qty.toFixed(4)}</Td>
                  <Td
                    align="right"
                    color={tr.slippage > 0 ? "red" : tr.slippage < 0 ? "emerald" : "muted"}
                  >
                    {tr.slippage.toFixed(2)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TabBtn({
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
      className={`pb-2 px-1 border-b-2 ${
        active
          ? "border-emerald-500 text-neutral-100"
          : "border-transparent text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-4 text-neutral-500 text-center">{children}</div>;
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-3 py-1.5 font-normal text-[10px] uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  color,
}: {
  children: React.ReactNode;
  align?: "right";
  color?: "emerald" | "red" | "muted";
}) {
  const c =
    color === "emerald"
      ? "text-emerald-400"
      : color === "red"
        ? "text-red-400"
        : color === "muted"
          ? "text-neutral-400"
          : "text-neutral-200";
  return (
    <td className={`px-3 py-0.5 ${align === "right" ? "text-right" : ""} ${c}`}>{children}</td>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
}
