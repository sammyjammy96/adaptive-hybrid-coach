# Profile Setup & Editing Design

> **Implementation gate:** Do not implement until `2026-05-20-interactive-features-design.md` is shipped (Tasks 5–11 of [`2026-05-20-interactive-features.md`](../plans/2026-05-20-interactive-features.md)). The reducer/persistence/AppState foundation is in place — this spec extends it without conflicting with the in-progress button work, but ordering it after the buttons land avoids merge churn.

> **Ordering relative to other follow-ups:** Ship this **before** [Smart Planner](2026-05-20-smart-planner-design.md). The picker reads `profile.currentGoal` and `profile.weeklyAvailability` — without real user data the picker still works, but it works on Kai's demo profile and the rationale strings feel off. OCR for Imports is independent and can ship in any order.

**Goal:** Let the user own their data. A soft prompt on first launch invites them to set up their profile; the Profile screen becomes fully editable so they can update name, age, goal, availability, PRs, injuries, and units anytime. Demo data stays visible until the user starts editing, so the app never looks blank.

**Date:** 2026-05-20
**Related:** Will integrate with [Smart Planner](2026-05-20-smart-planner-design.md) once that ships.

---

## Scope

**In scope**
- Move `AthleteProfile` from a `demoData` constant into `AppState.profile` so it can be edited and persisted.
- Add `hasCustomizedProfile: boolean` and `hasDismissedProfilePrompt: boolean` to `AppState` so the soft prompt can decide whether to show.
- New reducer action `UPDATE_PROFILE { profile: AthleteProfile }` that replaces the profile slice and flips `hasCustomizedProfile` to `true`.
- New reducer action `DISMISS_PROFILE_PROMPT` that sets `hasDismissedProfilePrompt` to `true`.
- Extend `RESET_TO_DEMO` so it resets the new flags and the profile to `demoProfile`.
- Soft prompt banner on the Today screen, dismissible, hidden once the user customizes the profile or dismisses it.
- Make `ProfileScreen` fully editable: every field has an inline control. One "Save profile" button at the bottom commits the dispatched update.
- PRs support add + remove. Availability supports per-day minute + available-toggle. Injury flags support add + remove. Units is a radio.

**Out of scope (explicit non-goals)**
- Multi-user / accounts / sync.
- Avatar upload or profile photo (no image storage in the static frontend).
- Wearable integrations (HRV from a watch, weight from a scale, etc.).
- Custom field types beyond what `AthleteProfile` already exposes.
- Onboarding tour beyond the single soft prompt (no multi-step wizard).
- Validation beyond "required text non-empty" — type-strict but not domain-strict.
- Server-side persistence — everything stays in localStorage.

---

## State changes

Add to `AppState`:

```ts
interface AppState {
  // … existing fields …
  profile: AthleteProfile;
  hasCustomizedProfile: boolean;
  hasDismissedProfilePrompt: boolean;
}
```

`initialAppState` seeds:

```ts
profile: demoProfile,
hasCustomizedProfile: false,
hasDismissedProfilePrompt: false,
```

The existing `demoProfile` export in `domain/demoData.ts` stays — it's the initial value, not a runtime source of truth anymore.

### Persistence

**No schema bump required.** The persistence layer's spread pattern (`{ ...initialAppState, ...candidate }`) means existing v1 payloads will pick up the new fields' defaults automatically. The `isValidShape` sanity check in `appPersistence.ts` only inspects the array fields (`workouts`, `logs`, `plan.sessions`), so additive scalar/object fields slide through cleanly.

This deliberately stays additive to avoid breaking deployed users' saved state. (Smart Planner, when it ships, will bump to v2 — but Profile Setup arrives before that.)

### New actions

```ts
| { type: 'UPDATE_PROFILE'; profile: AthleteProfile }
| { type: 'DISMISS_PROFILE_PROMPT' }
```

Reducer behavior:

- `UPDATE_PROFILE` → `{ ...state, profile: action.profile, hasCustomizedProfile: true }`. No partial merges — the payload is the full profile, the screen-level form is responsible for assembling it. Identity preservation: if the payload is reference-equal to the current profile (e.g. user clicks Save without changes), return `state` unchanged.
- `DISMISS_PROFILE_PROMPT` → `{ ...state, hasDismissedProfilePrompt: true }`. No-op if already `true`.
- `RESET_TO_DEMO` → already returns `initialAppState`, so the new fields reset for free.

---

## App.tsx changes

Currently `App.tsx` imports `demoProfile` from `demoData` and passes it to `ProfileScreen`. After this spec:

```tsx
<ProfileScreen
  profile={state.profile}
  onUpdate={(profile) => dispatch({ type: 'UPDATE_PROFILE', profile })}
  onReset={() => dispatch({ type: 'RESET_TO_DEMO' })}
/>
```

`demoProfile` is no longer imported in `App.tsx`. It still exists in `demoData.ts` because `initialAppState` references it.

The Today screen now receives the soft-prompt context:

```tsx
<TodayScreen
  // … existing props …
  showProfilePrompt={!state.hasCustomizedProfile && !state.hasDismissedProfilePrompt}
  onDismissProfilePrompt={() => dispatch({ type: 'DISMISS_PROFILE_PROMPT' })}
  onNavigateToProfile={() => dispatch({ type: 'SET_ACTIVE_SCREEN', screen: 'profile' })}
/>
```

---

## UI: soft prompt on Today

When `showProfilePrompt` is `true`, render a banner at the top of the Today content (above the existing `MetricRing` and headline). Shape:

- Background: muted accent (similar to existing `.coach-card` styling but distinct).
- Left icon: a small "user" or "spark" lucide icon.
- Body: "Set up your profile to make Hybrid Coach feel like yours." (one sentence, fits two lines on mobile).
- Two actions: a primary "Set up" button (navigates to Profile screen) and a small "×" dismiss button (top-right of the banner).

When `hasCustomizedProfile` becomes `true` (user saved a real profile) OR `hasDismissedProfilePrompt` becomes `true`, the banner is gone forever. RESET_TO_DEMO brings it back.

CSS appends to `styles.css` — new class `.profile-prompt` matching the card aesthetic.

---

## UI: editable Profile screen

`ProfileScreen.tsx` becomes a controlled form. The shape stays the same (Goal card, PRs card, Availability card, Privacy card, Reset row), but every field has an inline input.

Component-local state holds the draft (`useState<AthleteProfile>(profile)`). Reset-on-prop-change: if the `profile` prop changes externally (e.g. after Reset prototype data), sync the draft via `useEffect`.

### Field controls

| Field | Control |
|---|---|
| `name` | `<input type="text" required>` |
| `age` | `<input type="number" min="14" max="100">` |
| `heightCm` | `<input type="number" min="100" max="240">` |
| `trainingAgeYears` | `<input type="number" min="0" max="60" step="0.5">` |
| `runningBaseline` | `<textarea rows="2">` |
| `currentGoal` | `<textarea rows="2">` |
| `preferredUnits` | radio `metric` / `imperial` |
| `weeklyAvailability` | per-day row: day label, available checkbox, minutes input (disabled when not available) |
| `prs` | list with delete buttons + small "Add PR" form (lift name + value) |
| `injuryFlags` | list with delete buttons + small "Add flag" input |

### Save flow

Single "Save profile" button at the bottom of the screen. Disabled until at least one field has changed from the prop value (cheap deep-equality check or simple change-flag tracking). On click:

1. Validate `name` is non-empty (the only required field — every other field has a sensible empty/zero value).
2. If invalid, surface an inline error next to the offending field. Don't dispatch.
3. If valid, dispatch `UPDATE_PROFILE` with the draft.
4. Show a "Saved" toast next to the Save button (same pattern as the Save Log toast from interactive-features Task 9).

The "Reset prototype data" button below stays unchanged (it now also resets the profile and the prompt flags).

---

## Tests

### Reducer
- `UPDATE_PROFILE` replaces `profile` and sets `hasCustomizedProfile: true`.
- `UPDATE_PROFILE` with the same reference returns `state` unchanged (identity preservation).
- `DISMISS_PROFILE_PROMPT` sets the flag to `true`; second dispatch is a no-op.
- `RESET_TO_DEMO` returns `profile: demoProfile` and both flags to `false`.

### Persistence
- Round-trip: save state with custom profile + flags, load returns it intact.
- Forward-compat: a v1 payload missing the new fields hydrates to `demoProfile` + `false` + `false`.

### App-level interactions
- On first render (clean localStorage), the soft prompt is visible on Today.
- Click "Set up" → navigates to Profile screen.
- Edit name, click Save → toast appears, navigate back to Today → prompt is gone.
- Reset prototype data → prompt is back, profile is `demoProfile`.
- Dismiss the prompt → it stays dismissed across reloads.

### Profile screen unit-ish tests
- Save is disabled when no field changed.
- Save is disabled when name is empty.
- Adding a PR, then deleting it, returns the form to its original state (Save disabled).

---

## UX details worth pinning

- **Soft prompt copy:** "Set up your profile to make Hybrid Coach feel like yours." — short, friendly, no emojis.
- **Demo-data hint:** while `hasCustomizedProfile === false`, render a small inline note at the top of the Profile screen: "Showing demo data — edit any field to make this yours." Disappears after first save.
- **Saved toast:** same component pattern as the Save Log toast (local state, 2s auto-clear).
- **Availability validation:** if a day is marked unavailable, the minutes input is disabled and shows "Rest" placeholder. Save still works.
- **PR add form:** two side-by-side inputs (lift name + value) and a "+" button. New PRs append to the end. Maximum 12 entries (arbitrary cap — way more than anyone needs and prevents accidental spam).
- **Injury flag add form:** single text input + "+" button. Same 12-entry cap.
- **Mobile layout:** the existing two-column Profile grid stacks; per-day availability rows stack too. No extra layout work needed beyond the existing media queries — the grid system already handles it.

---

## Risks

- **Adding profile to AppState increases the persisted blob.** Modest — `AthleteProfile` is maybe 800 bytes JSON-stringified. Not a real issue.
- **Validation is light.** A user could enter `age: 12` or empty PR values. For a personal prototype this is acceptable — type-strict (number is a number) but not domain-strict. Tightening later is easy.
- **Field count is large.** ProfileScreen's component will grow from ~50 lines to ~200+ once all controls are wired. Worth keeping a flat structure and pulling out small sub-components (`AvailabilityEditor`, `PrEditor`, `InjuryFlagEditor`) if it gets unwieldy during implementation.
- **The "name required" rule is a friction point.** Could relax to "no required fields" — keep `name: ''` default and treat empty as "no name set". Implementation decision; the spec defaults to requiring name.

---

## Non-goals reaffirmed

- No multi-user, no accounts, no sync.
- No avatar/photo upload.
- No wearables.
- No onboarding tour beyond the single soft prompt.
- No domain-strict validation (age ranges enforced at input level via `min`/`max`, but no runtime guard).
- No server persistence.
