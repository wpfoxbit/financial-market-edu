import { useTranslation } from "react-i18next";
import { useTabStore } from "./state/tab-store";
import { Workspace } from "./ui/pages/Workspace";
import { SandboxWorkspace } from "./ui/pages/SandboxWorkspace";
import { TabBar } from "./ui/components/TabBar/TabBar";

export default function App() {
  const { t, i18n } = useTranslation();
  const activeTab = useTabStore((s) => s.activeTab);

  return (
    <div className="flex flex-col h-screen text-neutral-100 bg-neutral-950">
      <header className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">{t("app.title")}</h1>
          <TabBar />
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

      {activeTab === "main" ? <Workspace /> : <SandboxWorkspace />}
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
