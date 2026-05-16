---
name: add-sandbox-bot
description: Add a new bot type for the sandbox tab. Bots are accounts with attached ScenarioGenerators that run on each clock tick. Use when the user wants a new automated behavior in the sandbox (e.g. iceberg-refresh bot, scalper bot, mean-reversion bot). Each bot type maps to a generator + a UI config panel.
---

# Add a sandbox bot type

A **sandbox bot** is an account with `kind: "<bot-name>-bot"` that has a `ScenarioGenerator` attached via `SandboxEngine.attachBot()`. The generator runs on each clock tick, emitting events (place-limit, cancel, market) that the engine dispatches against the shared book. The bot's fills are routed back to its account position.

## When to invoke this skill

When the user wants a new automated actor in the sandbox that doesn't fit the existing `liquidity-bot` or `market-bot` types. Examples:
- "Add a bot that does iceberg refresh at a specific price"
- "I want a scalper bot that flips around the spread"
- "Create a mean-reversion bot"

If the behavior pattern itself doesn't exist yet, run `add-scenario-generator` first to create the underlying generator, then come back here to wire it as a bot.

## Steps to follow

1. **Confirm the bot name and behavior** with the user. Use `<name>-bot` as the kind (e.g. `iceberg-bot`, `scalper-bot`).

2. **Check if a suitable generator already exists** under `src/core/simulation/generators/`. If not, use `add-scenario-generator` to create one first. The generator must implement the `ScenarioGenerator` interface from `src/core/simulation/generators/types.ts`.

3. **Add the bot kind** to the `AccountKind` union type in `src/core/sandbox/account.ts`:
   ```ts
   export type AccountKind = "manual" | "liquidity-bot" | "market-bot" | "<name>-bot";
   ```

4. **Add a config interface** in `src/state/sandbox-store.ts`:
   ```ts
   export interface <PascalName>BotConfig {
     // The params the user can configure in the UI
   }
   ```

5. **Add an attach action** in `src/state/sandbox-store.ts`:
   - Add `attach<PascalName>Bot: (accountId: AccountId, config: <PascalName>BotConfig) => void` to the `SandboxState` interface.
   - Implement it: instantiate the generator with the config params and call `engine.attachBot(accountId, generator)`.

6. **Add a UI config section** in `src/ui/components/BotConfig/BotConfig.tsx`:
   - Add a new conditional block for `resolvedAccount?.kind === "<name>-bot"` with input fields for the config params.
   - Wire the submit button to the new `attach<PascalName>Bot` store action.

7. **Update account creation UI** in `src/ui/components/AccountManager/AccountManager.tsx`:
   - Add the new kind to the `<select>` dropdown options.

8. **Add i18n keys** in `src/i18n/locales/{en,pt-BR}.json` under the `sandbox` namespace:
   - `sandbox.kind<PascalName>Bot` — display name for account list
   - `sandbox.<camelName>Bot` — section header in BotConfig
   - One key per configurable param

9. **Add tests** if the bot has non-trivial wiring logic (e.g. custom param mapping). The underlying generator should already be tested via its own test file.

## Hard rules

- The generator itself MUST live in `src/core/simulation/generators/` — not in `sandbox/` or `state/`.
- Bot config UI goes in `BotConfig.tsx` — don't create a separate component per bot.
- Account kind options go in `AccountManager.tsx` — the `<select>` dropdown.
- All user-facing strings through `t()`.
- Bot generators MUST be deterministic (use `ctx.rng`, not `Math.random()`).

## Existing bot types for reference

- **liquidity-bot**: uses `LiquidityGen`. Config: referencePrice, targetSpread, targetLevels, qtyMean, qtyStdev, refreshChance.
- **market-bot**: uses `AggressionGen`. Config: lambda, sizeMean, sizeStdev, sideBias.

## After done

Tell the user the new bot type is available in the AccountManager dropdown. Explain what params to tweak for different market effects.
