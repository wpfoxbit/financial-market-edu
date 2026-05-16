import type { Order, OrderId, Side, Symbol } from "../../types";
import type { RNG } from "../../utils/rng";

export type GeneratorEvent =
  | { kind: "place-limit"; order: Order }
  | { kind: "cancel"; orderId: OrderId }
  | { kind: "market"; side: Side; qty: number; takerId: string };

/**
 * Read-only view of the order book exposed to generators. Generators MUST NOT
 * mutate the book — they emit GeneratorEvents that the scenario player
 * dispatches against the real book.
 */
export interface BookView {
  bestBid(): number | undefined;
  bestAsk(): number | undefined;
  midPrice(): number | undefined;
  spread(): number | undefined;
  totalQtyAt(side: Side, price: number): number;
  totalQtyOnSide(side: Side): number;
}

export interface GeneratorContext {
  book: BookView;
  rng: RNG;
  nextOrderId: () => string;
  timestamp: number;
  tickIndex: number;
  symbol: Symbol;
}

export interface ScenarioGenerator {
  readonly id: string;
  tick(ctx: GeneratorContext): GeneratorEvent[];
  reset?(): void;
}

export function roundToStep(v: number, step: number): number {
  return Math.round(v / step) * step;
}
