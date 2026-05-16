import { validateScenario, type Scenario } from "@core/simulation/scenario";
import liquid from "./liquid-market.json";
import illiquid from "./illiquid-market.json";
import frozen from "./frozen-book.json";
import buyers from "./aggressive-buyers.json";
import sellers from "./aggressive-sellers.json";
import absorption from "./absorption-at-level.json";

export const BUILTIN_SCENARIOS: readonly Scenario[] = [
  validateScenario(liquid),
  validateScenario(illiquid),
  validateScenario(frozen),
  validateScenario(buyers),
  validateScenario(sellers),
  validateScenario(absorption),
];

export const DEFAULT_SCENARIO_ID = "liquid-market";

export function findBuiltinScenario(id: string): Scenario | undefined {
  return BUILTIN_SCENARIOS.find((s) => s.id === id);
}
