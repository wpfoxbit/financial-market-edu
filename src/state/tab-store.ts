import { create } from "zustand";

export type TabId = "main" | "sandbox";

interface TabState {
  activeTab: TabId;
  setTab: (tab: TabId) => void;
}

export const useTabStore = create<TabState>((set) => ({
  activeTab: "main",
  setTab: (tab) => set({ activeTab: tab }),
}));
