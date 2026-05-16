import { useTranslation } from "react-i18next";
import { useTabStore, type TabId } from "@state/tab-store";

const TABS: TabId[] = ["main", "sandbox"];

export function TabBar() {
  const { t } = useTranslation();
  const activeTab = useTabStore((s) => s.activeTab);
  const setTab = useTabStore((s) => s.setTab);

  return (
    <div className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setTab(tab)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeTab === tab
              ? "bg-emerald-700 text-white"
              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
          }`}
        >
          {t(`tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
}
