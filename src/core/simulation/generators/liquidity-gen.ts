import { makeOrder, type Side } from "../../types";
import type { GeneratorContext, GeneratorEvent, ScenarioGenerator } from "./types";
import { roundToStep } from "./types";

export interface LiquidityGenParams {
  referencePrice: number;
  targetSpread: number;
  targetLevels: number;
  qtyMean: number;
  qtyStdev: number;
  refreshChance: number;
  tickSize: number;
  qtyStep: number;
}

/**
 * Maintains ambient resting liquidity around a reference price. Each tick,
 * with probability `refreshChance`, adds one limit order on a side biased
 * toward whichever side is currently thinner.
 */
export class LiquidityGen implements ScenarioGenerator {
  readonly id: string;
  readonly params: LiquidityGenParams;

  constructor(id: string, params: LiquidityGenParams) {
    this.id = id;
    this.params = params;
  }

  tick(ctx: GeneratorContext): GeneratorEvent[] {
    const { rng, book } = ctx;
    if (!rng.nextBool(this.params.refreshChance)) return [];

    // Bias toward the thinner side so both sides stay populated.
    const buyTotal = book.totalQtyOnSide("buy");
    const sellTotal = book.totalQtyOnSide("sell");
    const buyBias = sellTotal === 0 && buyTotal === 0 ? 0.5 : sellTotal / (buyTotal + sellTotal);
    const side: Side = rng.nextBool(buyBias) ? "buy" : "sell";

    const ref = this.params.referencePrice;
    const halfSpread = this.params.targetSpread / 2;
    const offsetLevels = rng.nextInt(0, this.params.targetLevels - 1);
    const basePrice = side === "buy" ? ref - halfSpread : ref + halfSpread;
    const rawPrice =
      side === "buy"
        ? basePrice - offsetLevels * this.params.tickSize
        : basePrice + offsetLevels * this.params.tickSize;
    const price = roundToStep(rawPrice, this.params.tickSize);

    const qtyRaw = Math.max(
      this.params.qtyStep,
      rng.nextNormal(this.params.qtyMean, this.params.qtyStdev),
    );
    const qty = roundToStep(qtyRaw, this.params.qtyStep);
    if (qty <= 0) return [];

    return [
      {
        kind: "place-limit",
        order: makeOrder({
          id: ctx.nextOrderId(),
          side,
          type: "limit",
          price,
          qty,
          ownerId: this.id,
          timestamp: ctx.timestamp,
        }),
      },
    ];
  }
}
