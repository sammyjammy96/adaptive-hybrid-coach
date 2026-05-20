# Smart Planner Design

> **Implementation gate:** Do not implement until `2026-05-20-interactive-features-design.md` is fully shipped (Tasks 5–11 of [`2026-05-20-interactive-features.md`](../plans/2026-05-20-interactive-features.md)). This spec replaces the simple template cycling in Task 7's Regenerate Week.

**Goal:** Replace the three hand-written plan variants with a tagged library of ~20 plans and a rule-based picker that selects the best-fit plan from the user's current state (recent logs, readiness, days since last hard session, stated goal). Produce a human-readable rationale alongside the pick so the user understands *why* they got this week.

**Date:** 2026-05-20
**Related:** `2026-05-20-adaptive-hybrid-coach-design.md` (read-only prototype), `2026-05-20-interactive-features-design.md` (active session-state work this builds on).

---

## Why this, not LLM-based generation

The honest constraint: this is a static-frontend prototype with no backend, no API keys, and no per-request budget for token costs. A tagged-library + rule-picker matches what good human coaches actually do — apply known principles to current state — and is testable, deterministic, and free. Real LLM generation can come later behind a backend (separate spec, separate budget) without invalidating any of this work.

---

## Scope

**In scope**
- Tagged library of ~20 `WeeklyPlan` variants in a new `src/domain/planLibrary.ts`.
- Pure picker function in `src/domain/planPicker.ts` that scores library entries against user state.
- Rationale generator (template-based, not AI) that explains the pick in 1–2 sentences.
- Replace the existing `planTemplates` + `planVariantIndex` cycling with library + picker.
- Schema bump (`schemaVersion: 2`) and migration that drops old state to demo defaults.
- Today screen surfaces the rationale string alongside (or replacing) the static `CoachRecommendation` for the current plan.

**Out of scope (explicit non-goals)**
- LLM/AI-driven generation.
- Multi-week periodization (taper blocks, build cycles).
- Drag-to-edit week (move/swap sessions by hand).
- Adapting from biometrics (HRV, Whoop, Garmin imports).
- Learning user preferences over time.
- Generating plans from scratch (we're picking, not synthesizing).

---

## Library shape

```ts
// src/domain/planLibrary.ts

export type PlanEmphasis = 'running' | 'lifting' | 'balanced' | 'recovery';
export type PlanLoad = 'easy' | 'moderate' | 'hard';
export type PlanVolume = 'low' | 'moderate' | 'high';

export interface PlanTags {
  emphasis: PlanEmphasis;
  load: PlanLoad;
  volume: PlanVolume;
  /** Minimum minutes/day this plan asks of the user. Used to gate against availability. */
  minDailyMinutes: number;
  /** Short slug for display/debug. */
  slug: string;
}

export interface TaggedPlan {
  tags: PlanTags;
  plan: WeeklyPlan;
}

export const planLibrary: readonly TaggedPlan[] = [ /* ~20 entries */ ];
```

Coverage target: each `emphasis × load` cell has at least one entry, with two `volume` variants where it makes sense. ~20 entries is enough for the matrix without becoming maintenance hell.

The exact 20-plan content is implementation work (the spec doesn't enumerate every session) but the contract is: every entry has all four tags, every `WeeklyPlan` validates against `domain/types.ts`, and at least one entry exists for `emphasis: 'recovery'`.

---

## Picker contract

```ts
// src/domain/planPicker.ts

export interface PickerInput {
  logs: TrainingLog[];                  // all, picker decides its own window
  readiness: ReadinessCheckIn;
  availability: AvailabilityWindow[];
  goal: string;                         // free-text from the profile
  excludeSlugs?: readonly string[];     // optional, avoids re-picking the current plan
}

export interface PickerResult {
  tagged: TaggedPlan;
  rationale: string;                    // 1–2 sentence human-readable explanation
  firedRules: readonly string[];        // for tests + debug; not surfaced in UI
  score: number;                        // for tests + debug
}

export function pickPlan(input: PickerInput): PickerResult;
```

### Scoring rules (rough, tunable during implementation)

| Signal | Effect on tag weights |
|---|---|
| Pain flag in last readiness | `emphasis: 'recovery'` × 5, `load: 'easy'` × 3 |
| Average RPE over last 5 logs ≥ 7.5 | `load: 'easy'` × 3, `volume: 'low'` × 2 |
| Skipped ≥ 2 sessions in last 7 days | `volume: 'low'` × 2, `load: 'easy'` × 2 |
| Readiness score < 60 | `load: 'easy'` × 2 |
| Goal mentions "run" or "running" or pace numbers | `emphasis: 'running'` × 4 |
| Goal mentions "strength", "lift", "CrossFit", "PR" | `emphasis: 'lifting'` × 4 |
| Goal mentions both (e.g. "improve running while keeping CrossFit") | `emphasis: 'balanced'` × 4 |
| Availability total < 200 min/week | `volume: 'low'` × 2 |
| Availability total > 350 min/week and last week's RPE moderate | `volume: 'high'` × 1 |
| No clear signal (new user, empty logs) | `emphasis: 'balanced'` × 2, `load: 'moderate'` × 2, `volume: 'moderate'` × 2 |

Scoring algorithm:
1. Compute tag weights from fired rules.
2. For each library entry, score = sum of weights for matching tag values. Entries failing the `minDailyMinutes` availability gate are filtered out.
3. Pick the highest score. Tie-break by `slug` ordering (deterministic). Exclude `excludeSlugs` first.

The exact numbers can be tuned during implementation — the spec locks in the *shape* of the rules, not the weights.

### Rationale generation

Template strings keyed by the dominant fired rule:

```
'pain-flagged' → 'Lighter week — you flagged pain on your check-in, so this plan keeps intensity low across the board.'
'high-fatigue-recent' → 'Easier load — your last 5 sessions averaged RPE {avgRpe}, which is a strong cue to back off.'
'skipped-sessions' → 'Smaller week — you skipped {n} sessions recently. This plan gives you space to actually finish each one.'
'goal-running' → 'Running emphasis — your goal mentions {goalKeyword}, so this week leans into aerobic work.'
'goal-lifting' → 'Strength emphasis — your goal centers on {goalKeyword}, so this week protects CrossFit volume.'
'balanced-default' → 'Balanced hybrid week — readiness is fine and your last week looked sustainable.'
```

Picker returns the highest-scoring single rationale rule (deterministic). Multiple-rule rationales (e.g. "Pain flagged AND high fatigue") are a future improvement — single-cause rationales are clearer for v1.

---

## State changes

Add to `AppState`:
- `planTags: PlanTags` — current plan's tags
- `planRationale: string` — last picker rationale

Remove from `AppState`:
- `planVariantIndex` — no longer needed (library is tag-selected, not index-cycled)

Bump `schemaVersion` to `2`. Migration: any state with `schemaVersion: 1` falls back to demo defaults (we explicitly chose not to migrate logs forward — this is a prototype and the new picker needs the new tag fields). Existing users on a deployed Pages site will lose their saved logs on first visit after the upgrade. Acceptable trade for a prototype; would need real migration for production.

### New action

```ts
{ type: 'PICK_NEW_PLAN' }
```

Replaces `REGENERATE_WEEK`. The reducer:
1. Builds `PickerInput` from current state (`logs`, last `readiness`, profile `availability` + `currentGoal`, current `planTags.slug` as `excludeSlugs`).
2. Calls `pickPlan(input)`.
3. Writes the result into `plan`, `planTags`, `planRationale`.

Since `readiness` and `availability` aren't in `AppState` today (they come from demo data in `App.tsx`), the reducer takes them as extra payload on the action:

```ts
{ type: 'PICK_NEW_PLAN'; readiness: ReadinessCheckIn; availability: AvailabilityWindow[]; goal: string }
```

The caller (PlanScreen via App.tsx) supplies the payload from the current demo-data sources. This keeps the reducer pure and avoids leaking demo-data imports into the reducer module.

---

## UI changes

**PlanScreen header**
- Variant pill replaced with `Tags: {emphasis} · {load} · {volume}` mini-summary.
- "Regenerate week" button label unchanged; behavior dispatches `PICK_NEW_PLAN` with the appropriate payload.

**Today screen**
- A new line below the existing CoachCard body, prefixed `Why this week:`, showing `state.planRationale`.
- Implementation detail: this can live inside CoachCard or be a sibling — implementer's choice.

**PlanScreen body**
- No structural change. The session grid still renders the same way.

---

## Testing

### planLibrary
- Every entry's `plan.sessions` validates against the `WeeklyPlan`/`PlannedSession` shape (smoke test).
- Coverage: at least one entry per `emphasis` value; at least one per `load` value.
- Each entry's `minDailyMinutes` is ≤ the max session duration in its plan.

### pickPlan
- New user with empty logs + balanced goal + moderate availability → returns a `balanced/moderate/moderate` plan.
- Pain-flagged readiness → returns a `recovery` or `easy` plan, regardless of other signals.
- High recent RPE + running goal → returns running emphasis but with `load: 'easy'`.
- Insufficient availability (low minDailyMinutes) → never returns high-volume plans.
- `excludeSlugs` containing the top-scored entry → returns the runner-up.
- Deterministic: identical input produces identical output (rationale, slug, score).

### rationale
- Each rationale template renders without `{placeholder}` substrings remaining.
- Pain-flag rationale is selected when `painFlag: true` even if other rules also fire.

### App-level integration test
- Click "Regenerate week", assert the plan and the rationale both update.

---

## Error handling

- Empty library → throw at module load (impossible if implementer adds plans, but worth a sanity check).
- No plan passes the availability filter → fall back to the entry with the lowest `minDailyMinutes` and produce a "Lighter week — your availability is tight" rationale.
- Picker called with malformed state (e.g. `logs` not an array) → throw. The persistence-layer `isValidShape` check prevents this in practice.

---

## Risks

- **Rule weights are arbitrary on day one.** The first 20 plans + rule weights are educated guesses. Plan to iterate after a few weeks of personal use — log which picks felt right and which didn't.
- **20 plans is a lot of content.** Implementer should expect this task to be writing-heavy (each plan is ~30–40 lines of TypeScript). Consider committing the library in two passes: 10 plans for the first PR, 10 more once the picker logic is verified.
- **Tag matrix sparsity.** Some `emphasis × load × volume` combinations may not make sense (e.g. `recovery/hard/high`). That's fine — those just won't have library entries and won't be scored.
- **Migration drops user data.** Users with saved logs on the deployed Pages site will lose them when the schema bumps. Document this in the release notes when shipping.

---

## Non-goals reaffirmed

- No LLM, no backend, no API keys.
- No multi-week periodization or training-block planning.
- No drag-to-edit week.
- No biometric integrations.
- No learning user preferences over time (rules are fixed code, not tuned weights from logs).
