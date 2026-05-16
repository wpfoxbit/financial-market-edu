import { validateScenario, type Scenario } from "@core/simulation/scenario";

const STORAGE_KEY = "fme.customScenarios";

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadCustomScenarios(): Scenario[] {
  const s = safeStorage();
  if (!s) return [];
  const raw = s.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        try {
          return validateScenario(item);
        } catch {
          return null;
        }
      })
      .filter((x): x is Scenario => x !== null);
  } catch {
    return [];
  }
}

export function saveCustomScenario(scenario: Scenario): Scenario[] {
  const s = safeStorage();
  const current = loadCustomScenarios().filter((x) => x.id !== scenario.id);
  const next = [...current, scenario];
  if (s) s.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteCustomScenario(id: string): Scenario[] {
  const s = safeStorage();
  const next = loadCustomScenarios().filter((x) => x.id !== id);
  if (s) s.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function exportScenarioJson(scenario: Scenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function downloadScenario(scenario: Scenario): void {
  const blob = new Blob([exportScenarioJson(scenario)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${scenario.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function readScenarioFromFile(file: File): Promise<Scenario> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return validateScenario(parsed);
}
