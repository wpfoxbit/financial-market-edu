---
name: add-scenario-preset
description: Create a new built-in scenario JSON preset under src/scenarios/ that combines existing generators with specific parameters to demonstrate a market situation (e.g. illiquid market, aggressive sellers, absorption at a key level, frozen book). Use when the desired demo can be expressed as a combination of existing generators — if it cannot, use add-scenario-generator instead.
---

# Add a scenario preset

A **preset** is a JSON file that wires together one or more generators with specific parameters to recreate a teachable market condition. Presets ship inside the app and appear in the Scenario panel; users can also import/export their own.

## When to invoke this skill

When the user describes a market situation and asks for it as a one-click demo. Examples:
- "Make a preset for a thin-liquidity Asian-session feel"
- "Add a 'pre-FOMC volatility' preset"
- "I want a preset where buyers are absorbing at 100k"

If the situation requires behavior no existing generator produces, stop and run `add-scenario-generator` first.

## Steps to follow

1. **Confirm the intent** with the user in market terms: which generators participate, which side dominates, what should the student *see* and *learn* from this preset. Capture this as a one-line educational summary.

2. **Read the schema**: open `src/core/simulation/scenario.ts` to see the `Scenario` JSON schema and at least one existing preset under `src/scenarios/` (e.g. `liquid-market.json`) for the shape.

3. **Create the file**: `src/scenarios/<kebab-case-name>.json`.
   - Required fields: `id`, `name`, `description`, `seed`, `generators[]`, `defaultTimeframe`.
   - Use a **fixed seed** so the preset replays identically every time.
   - `description` should be 1–2 sentences explaining what the student is meant to observe.

4. **Validate the JSON**: run the scenario schema validator (`npm test -- scenario-schema`) before committing. A malformed preset will fail to load.

5. **Register it** in `src/scenarios/index.ts` (the preset registry) so it shows up in the Scenario panel dropdown.

6. **Add i18n keys** for the `name` and `description` if you want them translatable: `scenarios.<id>.name`, `scenarios.<id>.description`. Reference these keys in the JSON via a `i18nKey` field (preferred over hardcoding the localized text).

7. **Add a screenshot test** (optional but recommended): in `tests/scenarios/<id>.snap.test.ts`, run the scenario for N ticks with the fixed seed and snapshot the resulting book state. This catches regressions where a generator change silently breaks a preset.

## Hard rules

- Presets MUST be valid JSON parseable by the `Scenario` schema. No comments, no trailing commas.
- Presets MUST set an explicit `seed` for reproducibility.
- Presets MUST NOT reference generators that don't exist in `src/core/simulation/generators/index.ts`.
- File name = preset `id`. Both kebab-case.

## After done

Mention to the user that the preset is now in the Scenario panel dropdown, and what they should look at when they play it (the 1-line educational summary captured in step 1).
