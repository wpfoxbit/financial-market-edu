import { makeOrder, type Side } from "../../types";
import type { GeneratorContext, GeneratorEvent, ScenarioGenerator } from "./types";
import { roundToStep } from "./types";

export interface AbsorptionGenParams {
  /** Which side is being defended. */
  side: Side;
  /** Price level the generator camps on. */
  price: number;
  /** Target qty at the level; refill until reaching this. */
  refillQty: number;
  /** Trigger a refill when current qty falls below this threshold. */
  threshold: number;
  qtyStep: number;
}

/**
 * Defends a single price level with a refilling iceberg-like wall. Demonstrates
 * absorption: aggressors hit the level, it gets refilled before price can move.
 */
export class AbsorptionGen implements ScenarioGenerator {
  readonly id: string;
  readonly params: AbsorptionGenParams;

  constructor(id: string, params: AbsorptionGenParams) {
    this.id = id;
    this.params = params;
  }

  tick(ctx: GeneratorContext): GeneratorEvent[] {
    const current = ctx.book.totalQtyAt(this.params.side, this.params.price);
    if (current >= this.params.threshold) return [];

    const needed = this.params.refillQty - current;
    const qty = roundToStep(needed, this.params.qtyStep);
    if (qty <= 0) return [];

    return [
      {
        kind: "place-limit",
        order: makeOrder({
          id: ctx.nextOrderId(),
          side: this.params.side,
          type: "limit",
          price: this.params.price,
          qty,
          ownerId: this.id,
          timestamp: ctx.timestamp,
        }),
      },
    ];
  }
}
