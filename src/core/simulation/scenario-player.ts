import { matchMarket, submitLimit } from "../matching";
import type { OrderBook } from "../orderbook";
import type { Side, Trade } from "../types";
import { RNG } from "../utils/rng";
import type { Feeder, FeederContext } from "./engine";
import {
  AbsorptionGen,
  AggressionGen,
  LiquidityGen,
  type ScenarioGenerator,
} from "./generators";
import type { GeneratorConfig, Scenario } from "./scenario";

/**
 * Runs a Scenario tick-by-tick. Generators emit events; the player dispatches
 * them against the real book and collects produced trades. Deterministic for
 * a given scenario.seed.
 */
export class ScenarioPlayer {
  readonly scenario: Scenario;
  readonly generators: readonly ScenarioGenerator[];
  private readonly rng: RNG;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.rng = new RNG(scenario.seed);
    this.generators = scenario.generators.map(instantiateGenerator);
  }

  readonly feeder: Feeder = (book, ctx) => {
    const trades: Trade[] = [];
    const events = [];

    const genCtx = {
      book,
      rng: this.rng,
      nextOrderId: ctx.nextOrderId,
      timestamp: ctx.timestamp,
      tickIndex: ctx.tickIndex,
      symbol: this.scenario.symbol,
    };

    for (const gen of this.generators) {
      events.push(...gen.tick(genCtx));
    }

    for (const ev of events) {
      switch (ev.kind) {
        case "place-limit":
          this.applyPlaceLimit(book, ev.order, ctx, trades);
          break;
        case "cancel":
          book.cancel(ev.orderId);
          break;
        case "market":
          this.applyMarket(book, ev.side, ev.qty, ev.takerId, ctx, trades);
          break;
      }
    }

    return { trades };
  };

  reset(): void {
    for (const g of this.generators) g.reset?.();
  }

  private applyPlaceLimit(
    book: OrderBook,
    order: import("../types").Order,
    ctx: FeederContext,
    out: Trade[],
  ): void {
    const opposite: Side = order.side === "buy" ? "sell" : "buy";
    const top = book.peekTop(opposite);
    const crosses = top
      ? order.side === "buy"
        ? top.price <= order.price
        : top.price >= order.price
      : false;

    if (crosses) {
      const r = submitLimit(book, order, {
        nextTradeId: ctx.nextTradeId,
        timestamp: ctx.timestamp,
      });
      out.push(...r.trades);
    } else {
      try {
        book.addLimit(order);
      } catch {
        // duplicate id or invalid — silently skip
      }
    }
  }

  private applyMarket(
    book: OrderBook,
    side: Side,
    qty: number,
    takerId: string,
    ctx: FeederContext,
    out: Trade[],
  ): void {
    if (qty <= 0) return;
    try {
      const r = matchMarket(book, side, qty, takerId, {
        nextTradeId: ctx.nextTradeId,
        timestamp: ctx.timestamp,
      });
      out.push(...r.trades);
    } catch {
      // empty side, etc — skip
    }
  }
}

function instantiateGenerator(cfg: GeneratorConfig): ScenarioGenerator {
  switch (cfg.kind) {
    case "liquidity":
      return new LiquidityGen(cfg.id, cfg.params);
    case "aggression":
      return new AggressionGen(cfg.id, cfg.params);
    case "absorption":
      return new AbsorptionGen(cfg.id, cfg.params);
  }
}
