---
name: add-scenario-generator
description: Scaffold a new scenario generator under src/core/simulation/generators/. Use when adding a new market-behavior pattern (e.g. iceberg-refresher, spoofing, momentum-ignition, layering, exhaustion) that emits events into the simulated order book. Each generator implements the shared Generator interface and is plugged into a Scenario.
---

# Add a scenario generator

A **generator** is a pure-TS class that, each clock tick, decides what events to push into the simulated order book — adding limit orders, canceling them, or firing market aggressions. It is the foundation of every didactic pattern (liquidity, aggression, absorption, etc.).

## When to invoke this skill

When the user asks for a new market-behavior pattern that doesn't fit cleanly into the existing generators. Examples:
- "Add a generator that simulates a spoofer placing and canceling large orders"
- "I want to demo iceberg refresh"
- "Create a momentum-ignition pattern"

If the new behavior is a *combination* of existing generators with different parameters, prefer `add-scenario-preset` instead.

## Steps to follow

1. **Confirm the name** with the user. Use kebab-case (e.g. `iceberg-refresher`, `spoofing`). Reject names that already exist under `src/core/simulation/generators/`.

2. **Read the contract**: open `src/core/simulation/generators/types.ts` (the `Generator` interface) and at least one existing generator (`liquidity-gen.ts` is the canonical reference) to understand the shape: constructor takes a typed `Params`, `tick(ctx)` returns/emits events into the book.

3. **Create the file**: `src/core/simulation/generators/<name>.ts`.
   - Export a class `<PascalName>Gen` implementing `Generator`.
   - Define and export a `<PascalName>Params` type.
   - Keep it **pure TS** — no React, no DOM, no `Math.random()` without going through `ctx.rng` (deterministic seeded RNG, required for replayable scenarios).

4. **Register it** in `src/core/simulation/generators/index.ts` (the generator registry) so scenarios can reference it by string key.

5. **Add tests**: `src/core/simulation/generators/<name>.test.ts`. At minimum:
   - It produces the expected event shape on a single tick.
   - It is deterministic given the same seed.
   - Edge cases relevant to the behavior (e.g. for `absorption`: orders are replenished after being hit).

6. **Add i18n keys** for any UI-visible label/description under `src/i18n/locales/{en,pt-BR}.json` (key: `generators.<name>.label`, `generators.<name>.description`).

7. **Update CLAUDE.md** only if the new generator introduces a *new architectural concept* (rare — most don't).

## Hard rules

- Generators MUST be deterministic given the scenario seed. Use `ctx.rng`, never `Math.random()`.
- Generators MUST NOT mutate book state directly — they emit events that the engine applies.
- Generators MUST NOT import from `src/ui/`, `src/state/`, or `src/adapters/`.
- Every new generator MUST have at least one test asserting deterministic behavior.

## After done

Mention to the user how to wire the generator into a scenario (either by editing a preset or by adding a slider in `ScenarioPanel`).
