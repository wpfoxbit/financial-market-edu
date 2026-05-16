import { describe, it, expect } from "vitest";
import { validateScenario, ScenarioValidationError } from "./scenario";

const valid = {
  id: "test",
  name: "Test",
  description: "Test scenario",
  seed: 42,
  symbol: { id: "FAKE", base: "F", quote: "K", tickSize: 0.5, qtyStep: 0.01 },
  timeframe: "1s",
  initialMidPrice: 100,
  seedSpread: 1,
  seedLevels: 5,
  seedQtyPerLevel: 1,
  generators: [
    {
      kind: "liquidity",
      id: "l",
      params: {
        referencePrice: 100,
        targetSpread: 1,
        targetLevels: 5,
        qtyMean: 1,
        qtyStdev: 0.2,
        refreshChance: 0.5,
        tickSize: 0.5,
        qtyStep: 0.01,
      },
    },
  ],
};

describe("validateScenario", () => {
  it("accepts a valid scenario", () => {
    expect(() => validateScenario(valid)).not.toThrow();
  });

  it("rejects non-object input", () => {
    expect(() => validateScenario(null)).toThrow(ScenarioValidationError);
    expect(() => validateScenario("foo")).toThrow(ScenarioValidationError);
  });

  it("rejects missing required string fields", () => {
    const bad = { ...valid, id: 42 };
    expect(() => validateScenario(bad)).toThrow(/id must be a string/);
  });

  it("rejects invalid timeframe", () => {
    const bad = { ...valid, timeframe: "999h" };
    expect(() => validateScenario(bad)).toThrow(/timeframe/);
  });

  it("rejects invalid generator kind", () => {
    const bad = {
      ...valid,
      generators: [{ kind: "nonsense", id: "x", params: {} }],
    };
    expect(() => validateScenario(bad)).toThrow(/generators\[0\].kind/);
  });

  it("rejects non-finite numbers", () => {
    const bad = { ...valid, seed: NaN };
    expect(() => validateScenario(bad)).toThrow(/seed/);
  });

  it("rejects malformed symbol", () => {
    const bad = { ...valid, symbol: { base: "F" } };
    expect(() => validateScenario(bad)).toThrow(/symbol/);
  });
});
