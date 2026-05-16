import type { Side } from "../../types";
import type { GeneratorContext, GeneratorEvent, ScenarioGenerator } from "./types";
import { roundToStep } from "./types";

export interface AggressionGenParams {
  /** Probability per tick of firing a market order. Approximates Poisson rate. */
  lambda: number;
  sizeMean: number;
  sizeStdev: number;
  /** Probability the taker is a buyer (0 = sells only, 1 = buys only, 0.5 = balanced). */
  sideBias: number;
  qtyStep: number;
}

/**
 * Generates market aggressions. Higher `lambda` → more flow. `sideBias`
 * skews the directional pressure (useful for "aggressive buyers" presets).
 */
export class AggressionGen implements ScenarioGenerator {
  readonly id: string;
  readonly params: AggressionGenParams;

  constructor(id: string, params: AggressionGenParams) {
    this.id = id;
    this.params = params;
  }

  tick(ctx: GeneratorContext): GeneratorEvent[] {
    const { rng } = ctx;
    if (!rng.nextBool(this.params.lambda)) return [];

    const side: Side = rng.nextBool(this.params.sideBias) ? "buy" : "sell";
    const rawSize = Math.abs(rng.nextNormal(this.params.sizeMean, this.params.sizeStdev));
    const qty = roundToStep(rawSize, this.params.qtyStep);
    if (qty <= 0) return [];

    return [{ kind: "market", side, qty, takerId: this.id }];
  }
}
