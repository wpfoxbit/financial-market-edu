import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSandboxStore } from "@state/sandbox-store";
import type { AccountKind } from "@core/sandbox";

export function AccountManager() {
  const { t } = useTranslation();
  const accounts = useSandboxStore((s) => s.accounts);
  const activeAccountId = useSandboxStore((s) => s.activeAccountId);
  const createAccount = useSandboxStore((s) => s.createAccount);
  const removeAccount = useSandboxStore((s) => s.removeAccount);
  const setActiveAccount = useSandboxStore((s) => s.setActiveAccount);

  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<AccountKind>("manual");

  const handleCreate = () => {
    const name = newName.trim() || `Account ${accounts.length + 1}`;
    createAccount(name, newKind);
    setNewName("");
  };

  return (
    <div className="flex flex-col gap-2 p-3 text-xs">
      <h2 className="text-neutral-400 uppercase tracking-wider text-[10px]">
        {t("sandbox.accounts")}
      </h2>

      {/* Account list */}
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {accounts.map((acct) => (
          <div
            key={acct.id}
            onClick={() => setActiveAccount(acct.id)}
            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer ${
              acct.id === activeAccountId
                ? "bg-emerald-900/40 border border-emerald-600/50"
                : "bg-neutral-800 hover:bg-neutral-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  acct.kind === "manual"
                    ? "bg-blue-400"
                    : acct.kind === "liquidity-bot"
                      ? "bg-amber-400"
                      : "bg-purple-400"
                }`}
              />
              <span className="text-neutral-200 truncate max-w-[100px]">{acct.name}</span>
              <span className="text-neutral-500 text-[9px]">
                {acct.kind === "manual" ? "" : acct.kind === "liquidity-bot" ? "LIQ" : "MKT"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`tabular-nums text-[10px] ${
                  acct.position.netQty > 0
                    ? "text-emerald-400"
                    : acct.position.netQty < 0
                      ? "text-red-400"
                      : "text-neutral-500"
                }`}
              >
                {acct.position.netQty === 0 ? "—" : acct.position.netQty.toFixed(2)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeAccount(acct.id);
                }}
                className="text-neutral-500 hover:text-red-400 text-[10px]"
                title={t("sandbox.removeAccount")}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-neutral-500 py-2 text-center">{t("sandbox.noAccounts")}</div>
        )}
      </div>

      {/* Create account form */}
      <div className="flex flex-col gap-1 pt-2 border-t border-neutral-800">
        <input
          type="text"
          placeholder={t("sandbox.accountName")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="px-2 py-1.5 bg-neutral-800 rounded text-neutral-100 border border-neutral-700 text-xs"
        />
        <div className="flex gap-1">
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as AccountKind)}
            className="flex-1 px-2 py-1 bg-neutral-800 rounded text-neutral-100 border border-neutral-700 text-xs"
          >
            <option value="manual">{t("sandbox.kindManual")}</option>
            <option value="liquidity-bot">{t("sandbox.kindLiquidityBot")}</option>
            <option value="market-bot">{t("sandbox.kindMarketBot")}</option>
          </select>
          <button
            onClick={handleCreate}
            className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium"
          >
            {t("sandbox.createAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
