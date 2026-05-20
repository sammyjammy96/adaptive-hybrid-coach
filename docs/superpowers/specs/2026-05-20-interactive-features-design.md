# Interactive Features Design

**Goal:** Wire every prototype button to a real behavior backed by localStorage so the app is usable end-to-end on a phone between sessions, while staying within the existing "static frontend, no backend" boundary.

**Date:** 2026-05-20
**Sister spec:** `2026-05-20-adaptive-hybrid-coach-design.md` (the read-only prototype this builds on)

---

## Scope

**In scope**
- A central `useReducer` in `App.tsx` holding all mutable state.
- Pure reducer in `src/domain/appState.ts`.
- Persistence layer in `src/services/appPersistence.ts`.
- Three plan variants in `src/domain/planTemplates.ts`.
- Six wired buttons: Apply easy version, Regenerate week, Upload screenshot, Save log, Approve/Reject per imported workout, Reset prototype data.
- Inline UX affordances: Saved toast, Restore link on modified sessions, disabled states.

**Out of scope (explicit non-goals)**
- Real OCR, image processing, or any upload to a server. The Upload button uses a real file picker, but the file is never read or stored — it's a confirmation gesture, nothing more.
- User accounts, authentication, cross-device sync.
- Any backend API of any kind.
- Calendar / nutrition / wearables / real PushPress integration.
- Migration tooling beyond a one-shot import of the existing `hybrid-coach-active-screen` key.
- Visual redesign — only additive styling for new controls.

---

## State shape

```ts
interface AppState {
  activeScreen: ScreenKey;
  workouts: ImportedWorkout[];   // hydrated from demoImportedWorkouts on first run
  plan: WeeklyPlan;              // baseline plan; protection applied at render, not stored
  logs: TrainingLog[];           // empty by default
  planVariantIndex: 0 | 1 | 2;   // which template Regenerate is showing
  schemaVersion: 1;
}
```

`plan` is the **baseline** (current variant + any per-session modifications). `protectRunsAfterHeavyLowerBody(plan, workouts)` runs as a derivation on each render — the protected form is never persisted. This avoids stale-derivation bugs when `workouts` changes.

`schemaVersion` exists so future shape changes can fall back to demo defaults cleanly. Bump it whenever `AppState` changes in a way that prior storage can't be safely consumed.

---

## Persistence

- Single localStorage key: `hybrid-coach-state-v1`.
- Hydration is a lazy initializer for `useReducer`: `useReducer(appReducer, undefined, loadAppState)`.
- Save is one `useEffect(() => saveAppState(state), [state])`.
- `loadAppState`:
  1. Read `hybrid-coach-state-v1`. If missing or parse error → return `initialAppState` from demo data.
  2. If `schemaVersion !== 1` → return `initialAppState`.
  3. **One-time migration:** if the loaded state has no `activeScreen`, fall back to reading the legacy `hybrid-coach-active-screen` key. After hydration succeeds once, the legacy key is forgotten (overwritten by the next save).
- The reducer **never** touches `localStorage`. Side effects stay in the `useEffect` boundary.

---

## Reducer action vocabulary

Nine actions. The reducer is pure: same `(state, action) → state` mapping, no I/O.

```ts
type AppAction =
  | { type: 'SET_ACTIVE_SCREEN'; screen: ScreenKey }
  | { type: 'APPROVE_WORKOUT'; id: string }
  | { type: 'REJECT_WORKOUT'; id: string }
  | { type: 'APPLY_EASY_VERSION'; flavor: 'easier' | 'recovery' }
  | { type: 'RESTORE_SESSION'; sessionId: string }
  | { type: 'REGENERATE_WEEK' }
  | { type: 'ADD_UPLOADED_WORKOUT'; fileName: string }
  | { type: 'SAVE_LOG'; log: TrainingLog }
  | { type: 'RESET_TO_DEMO' };
```

The caller (each screen / component) decides which action to dispatch and assembles its payload. Logic that "looks up" things (e.g. the next eligible session for Apply easy version) lives in pure helpers in `domain/`, callable from both the reducer and the caller for display.

---

## Per-button behavior

### Apply easy version (CoachCard on Today)

Caller picks `flavor` based on the current `CoachRecommendation.id`:
- `pain-flag` → `'recovery'`
- `low-readiness` | `'steady-plan'` → `'easier'`

Reducer finds the next `planned` session with `intensity === 'high'` (using a pure helper `findNextHardPlannedSession(plan)`):
- `'easier'` flavor → set `intensity` to `'low'`, prepend `"Easier: "` to title, set `status` to `'modified'`. Leave `type` alone.
- `'recovery'` flavor → swap `type` to `'recovery'`, replace title with `"Recovery session"`, replace purpose with `"Pain flagged — keep training conservative"`, set `intensity` to `'low'`, set `status` to `'modified'`.

If no eligible session exists → the action is a no-op and the button is rendered disabled (CoachCard receives a `disabled` prop computed by Today from `findNextHardPlannedSession`).

The modified SessionCard renders an inline "Restore" link (only when `status === 'modified'`) that dispatches `RESTORE_SESSION`, which looks up the original session by id from the current variant in `planTemplates.ts` and overwrites the modified session's fields with the template's. The `status` resets to `'planned'`.

### Regenerate week (Plan header)

Cycles `planVariantIndex` through `0 → 1 → 2 → 0`. The new `plan` is replaced wholesale with the variant from `planTemplates.ts` — any per-session Apply-easy modifications are wiped, consistent with "regenerate".

Variants (concrete content tuned during implementation; characteristics fixed here):
- **0 — base:** the existing `demoWeeklyPlan` (2 CrossFit, 3 runs, 1 hard).
- **1 — running-bias:** 1 CrossFit, 4 runs (including a longer long-run and one extra easy day), 1 hard.
- **2 — lifting-bias:** 3 CrossFit (added gymnastics-skill day), 2 runs (shorter long-run), 1 hard.

The Plan header gains a small label next to the button (e.g. "Variant: base") so the user can see which one they're on.

### Upload screenshot (Import header)

The header button is a `<label>` wrapping a hidden `<input type="file" accept="image/*" capture="environment">`. The `capture="environment"` hint asks mobile browsers to offer the rear camera.

On `change`: dispatch `ADD_UPLOADED_WORKOUT { fileName: e.target.files[0].name }`. **File contents are never read.** The reducer appends a canned `ImportedWorkout`:

```
{
  id: 'uploaded-' + crypto.randomUUID(),
  day: <next day-of-week with no workout entry, fallback 'Thu'>,
  source: 'pushpress-screenshot',
  title: `Uploaded: ${fileName}`,
  extractedText: 'Uploaded image processed in prototype mode. Real OCR runs through a future backend.',
  confidence: 0.65,
  reviewState: 'needs-review',
  lowerBodyLoad: 'moderate',
  metconIntensity: 'moderate',
  fatigueImpact: 'moderate',
  tags: [{ label: 'imported', level: 'moderate' }]
}
```

The file `<input>` is cleared after dispatch so the same file can be selected again.

### Save log (Log screen)

LogScreen converts its inputs from uncontrolled (`defaultValue`) to **controlled** state (local component `useState` for each field). Existing fields keep their roles; new addition is a session `<select>` at the top.

- Session select options: each item in `state.plan.sessions`, rendered as `"Day — Title"`.
- Save is disabled until: session selected, RPE in `[1, 10]`, duration ≥ 0.
- On click: dispatch `SAVE_LOG` with a fully-formed `TrainingLog`. A local `useState<'idle' | 'saved'>` flips to `'saved'`, sets a `setTimeout` for 2s that flips it back. The "Saved" message renders inline next to the button.
- After save, form fields reset to defaults; session selection persists for convenience.
- Below the form, a **Recent logs** panel shows the latest 3 entries from `state.logs` (reverse chronological), each rendering session title + completion + RPE.

### Approve / Needs review (per ImportedWorkout)

The current static status chip ("approved" / "needs review") is replaced with two toggle buttons on each card: ✓ Approve and ↺ Needs review. The button matching the current `reviewState` is rendered filled (active); the other is outlined. Clicking the active one is a no-op (or, equivalently, the active one is disabled).

Clicking dispatches `APPROVE_WORKOUT { id }` or `REJECT_WORKOUT { id }`. Today and Plan recompute their protected plan on the next render because `protectRunsAfterHeavyLowerBody` derives from `state.workouts`.

### Reset prototype data (Profile screen)

A new destructive-styled button at the bottom of Profile: "Reset prototype data". Native `window.confirm("This clears all your saved logs, approvals, and plan changes. Continue?")` gate; on OK, dispatch `RESET_TO_DEMO`. Reducer returns `initialAppState`. The next persistence effect overwrites `hybrid-coach-state-v1`.

---

## Component changes

### New files
- `src/domain/appState.ts` — `AppState`, `AppAction`, `initialAppState`, `appReducer`, helpers (`findNextHardPlannedSession`, `nextEmptyDay`).
- `src/domain/planTemplates.ts` — `planTemplates: readonly [WeeklyPlan, WeeklyPlan, WeeklyPlan]` (base / running-bias / lifting-bias).
- `src/services/appPersistence.ts` — `loadAppState`, `saveAppState`.
- `src/domain/appState.test.ts` — one test per action plus helper tests.
- `src/services/appPersistence.test.ts` — hydration paths (clean, corrupt, schema-mismatch, old-key migration).

### Modified files
- `src/App.tsx` — replaces `useState<ScreenKey>` with `useReducer(appReducer, undefined, loadAppState)`; one `useEffect` calls `saveAppState(state)` on change; passes `state` slices + typed dispatch wrappers to screens.
- `src/screens/LogScreen.tsx` — controlled inputs; session `<select>`; Save validation; Saved toast; Recent logs panel.
- `src/screens/ImportScreen.tsx` — accepts `workouts` from state; Approve / Needs review buttons per card; hidden file input + label.
- `src/screens/PlanScreen.tsx` — wires Regenerate to callback; variant label next to button; passes `onRestore` to SessionCard.
- `src/screens/TodayScreen.tsx` — passes `onAction` and `disabled` to CoachCard.
- `src/screens/ProfileScreen.tsx` — Reset button.
- `src/components/CoachCard.tsx` — adds `onAction` and `disabled` props.
- `src/components/SessionCard.tsx` — optional `onRestore` prop; renders Restore link when `status === 'modified'`.
- `src/styles.css` — appends rules for the Approve/Reject toggle pair, Saved toast, hidden file input + styled label, Restore link, Recent logs panel, destructive button.
- `src/__tests__/app.test.tsx` — extends with interaction tests for Save log, Approve, Apply easy version.

### Unchanged
- `src/domain/types.ts`, `src/domain/planning.ts`, `src/services/localStore.ts`, `src/components/{LoadBalance,MetricRing}.tsx`.

---

## Data flow

```
demoData / planTemplates ─┐
                          ├─► initialAppState ─► loadAppState ─► useReducer ─► state
localStorage  ────────────┘                                          │
                                                                     │
                                          screens receive state + dispatchers
                                          screens emit dispatchers ──┘
                                          useEffect: saveAppState(state)
```

Top-down props for data, callbacks-up for actions. Same shape as today; just more of it.

---

## Error handling

- localStorage write failures → swallowed by the existing `localStore.ts` try/catch, returns `false`. We do not surface this to the user (a prototype offline-friendly app cannot recover from a localStorage block).
- Corrupt or schema-mismatched stored state → `loadAppState` returns `initialAppState`. No error surfaced; the user just sees a fresh demo state.
- LogScreen invalid input → Save button is disabled until the form is valid. No error toasts.
- Apply easy version with no eligible session → button is disabled.
- Approve/Reject for an unknown id → reducer no-op (defensive; should not happen).
- Restore for an unknown session id → reducer no-op.

---

## Testing

### appState.test.ts (one describe per action)
- `SET_ACTIVE_SCREEN` updates `activeScreen`.
- `APPROVE_WORKOUT` flips reviewState; unknown id is no-op.
- `REJECT_WORKOUT` flips back to `'needs-review'`.
- `APPLY_EASY_VERSION` with `'easier'` flavor mutates the next high-intensity planned session as specified; no-op if no eligible session.
- `APPLY_EASY_VERSION` with `'recovery'` flavor swaps type to recovery.
- `RESTORE_SESSION` restores from the variant template; unknown id is no-op.
- `REGENERATE_WEEK` cycles the variant and replaces `plan` wholesale.
- `ADD_UPLOADED_WORKOUT` appends a workout with the expected shape; `day` defaults sensibly.
- `SAVE_LOG` appends to `logs` array.
- `RESET_TO_DEMO` returns `initialAppState`.

### appPersistence.test.ts
- Clean hydration (no stored state) → demo defaults.
- Round-trip save / load preserves state.
- Corrupt JSON → demo defaults.
- Schema mismatch (`schemaVersion: 0`) → demo defaults.
- Legacy `hybrid-coach-active-screen` key picked up on first load.

### app.test.tsx (additions)
- Save log: fill out form, click Save, see "Saved" message, see entry in Recent logs.
- Approve: click Approve on the Wed workout, status updates, no console errors.
- Apply easy version: click on Today, the next-session card shows `Easier:` prefix and `low` intensity chip.

---

## UX details (small, but enumerated for the implementer)

- **Saved toast:** plain text "Saved" next to the Save button, color #7ee0b2 (the accent green), fades via `opacity` transition over 200ms. Vanishes after 2s.
- **Approve/Reject toggle:** uses the existing `.intensity-chip` shape language so it looks of-a-piece with the rest of the UI. Active state: filled with accent green for Approve / amber for Needs review. Inactive: outline only.
- **Restore link:** inline text link "Restore" inside the SessionCard, rendered to the right of the warning line (or as a sibling if no warning).
- **Hidden file input:** `<input type="file">` is visually hidden with the standard `clip: rect(0 0 0 0)` pattern; the `<label>` is the visible button.
- **Reset button:** uses a new `.destructive-action` class — red text, transparent background, red border. Placed at the very bottom of Profile, below the privacy mode panel, with `margin-top` separating it from the rest.
- **Variant label on Plan:** small monospace pill next to "Regenerate week" reading `Variant: base` / `running` / `lifting`.

---

## Risks

- **localStorage quota in private browsing:** Some mobile browsers (Safari private) restrict localStorage. State will silently fail to persist; the app stays usable in-session. Mentioned in error handling above; no special UI.
- **State drift between variants and modifications:** If a user applies "easy version" then "regenerate" they lose the modification. This is documented behavior, not a bug.
- **Workout IDs from uploads:** Use `crypto.randomUUID()` (widely available; if a target browser lacks it, fall back to `Date.now().toString(36)`).

---

## Non-goals reaffirmed

This spec does not add: backends, auth, sync, OCR, AI, calendar, nutrition, wearables, real PushPress, or any visual redesign. The README's security boundary stands unchanged.
