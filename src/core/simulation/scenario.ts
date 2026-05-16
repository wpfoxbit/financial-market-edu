import type { Symbol, Timeframe } from "../types";
import type {
  AbsorptionGenParams,
  AggressionGenParams,
  LiquidityGenParams,
} from "./generators";

export type GeneratorConfig =
  | { kind: "liquidity"; id: string; params: LiquidityGenParams }
  | { kind: "aggression"; id: string; params: AggressionGenParams }
  | { kind: "absorption"; id: string; params: AbsorptionGenParams };

export interface Scenario {
  id: string;
  name: string;
  description: string;
  seed: number;
  symbol: Symbol;
  timeframe: Timeframe;
  initialMidPrice: number;
  seedSpread: number;
  seedLevels: number;
  seedQtyPerLevel: number;
  generators: GeneratorConfig[];
}

export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(`Invalid scenario: ${message}`);
    this.name = "ScenarioValidationError";
  }
}

const TIMEFRAMES: Timeframe[] = ["1s", "5s", "15s", "1m", "5m", "15m", "1h"];

export function validateScenario(input: unknown): Scenario {
  if (typeof input !== "object" || input === null) {
    throw new ScenarioValidationError("expected an object");
  }
  const s = input as Record<string, unknown>;

  requireString(s, "id");
  requireString(s, "name");
  requireString(s, "description");
  requireNumber(s, "seed");
  requireNumber(s, "initialMidPrice");
  requireNumber(s, "seedSpread");
  requireNumber(s, "seedLevels");
  requireNumber(s, "seedQtyPerLevel");

  const tf = s.timeframe;
  if (typeof tf !== "string" || !TIMEFRAMES.includes(tf as Timeframe)) {
    throw new ScenarioValidationError(`timeframe must be one of ${TIMEFRAMES.join(", ")}`);
  }

  const symbol = s.symbol;
  if (typeof symbol !== "object" || symbol === null) {
    throw new ScenarioValidationError("symbol must be an object");
  }
  const sym = symbol as Record<string, unknown>;
  requireString(sym, "id", "symbol.id");
  requireString(sym, "base", "symbol.base");
  requireString(sym, "quote", "symbol.quote");
  requireNumber(sym, "tickSize", "symbol.tickSize");
  requireNumber(sym, "qtyStep", "symbol.qtyStep");

  const generators = s.generators;
  if (!Array.isArray(generators)) {
    throw new ScenarioValidationError("generators must be an array");
  }
  for (let i = 0; i < generators.length; i++) {
    validateGeneratorConfig(generators[i], i);
  }

  return input as Scenario;
}

function validateGeneratorConfig(g: unknown, idx: number): void {
  if (typeof g !== "object" || g === null) {
    throw new ScenarioValidationError(`generators[${idx}] must be an object`);
  }
  const gen = g as Record<string, unknown>;
  const kind = gen.kind;
  if (kind !== "liquidity" && kind !== "aggression" && kind !== "absorption") {
    throw new ScenarioValidationError(`generators[${idx}].kind must be liquidity|aggression|absorption`);
  }
  requireString(gen, "id", `generators[${idx}].id`);
  if (typeof gen.params !== "object" || gen.params === null) {
    throw new ScenarioValidationError(`generators[${idx}].params must be an object`);
  }
}

function requireString(obj: Record<string, unknown>, key: string, path = key): void {
  if (typeof obj[key] !== "string") {
    throw new ScenarioValidationError(`${path} must be a string`);
  }
}

function requireNumber(obj: Record<string, unknown>, key: string, path = key): void {
  if (typeof obj[key] !== "number" || !Number.isFinite(obj[key] as number)) {
    throw new ScenarioValidationError(`${path} must be a finite number`);
  }
}
