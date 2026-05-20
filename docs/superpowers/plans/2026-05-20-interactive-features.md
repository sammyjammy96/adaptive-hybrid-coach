# Interactive Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every prototype button to a real behavior backed by localStorage, turning the read-only app into an interactive one without crossing the static-frontend boundary.

**Architecture:** Centralized `useReducer` in `App.tsx`; pure reducer in `src/domain/appState.ts`; persistence layer in `src/services/appPersistence.ts`; three plan variants in `src/domain/planTemplates.ts`. Screens receive state slices via props and emit changes via dispatch wrappers — the existing presentational shape stays.

**Tech Stack:** React 19, TypeScript (strict), Vite, Vitest, React Testing Library, jsdom, lucide-react. No new runtime dependencies.

**Source spec:** [`docs/superpowers/specs/2026-05-20-interactive-features-design.md`](../specs/2026-05-20-interactive-features-design.md)

---

## Working Directory & Run Convention

All commands run from `C:\Users\kai_b\OneDrive\Documents\Training App` (or its equivalent on a Linux/macOS machine). Local binaries are invoked through `node` because the user's global `npm` shim is broken; equivalents:

| Logical command | Concrete command |
|---|---|
| run a single test file | `node ./node_modules/vitest/vitest.mjs run path/to/file.test.ts` |
| run a single test by name | `node ./node_modules/vitest/vitest.mjs run -t "test name"` |
| typecheck | `node ./node_modules/typescript/bin/tsc --noEmit` |
| build | `node ./node_modules/vite/bin/vite.js build` |
| verify (test + check-no-secrets + build) | run each in sequence |

If `npm` is fixed on the executor's machine, `npm run test`, `npm run build`, `npm run verify` work identically.

---

## File Structure (locked in before tasks)

**New**
- `src/domain/planTemplates.ts` — three `WeeklyPlan` variants.
- `src/domain/appState.ts` — `AppState`, `AppAction`, `initialAppState`, `appReducer`, helpers `findNextHardPlannedSession` and `nextEmptyDay`.
- `src/domain/appState.test.ts` — reducer + helper unit tests.
- `src/services/appPersistence.ts` — `loadAppState`, `saveAppState`.
- `src/services/appPersistence.test.ts` — hydration unit tests.

**Modified**
- `src/App.tsx` — reducer + persistence wiring; passes state and typed dispatchers to screens.
- `src/screens/TodayScreen.tsx` — `onApplyEasyVersion` callback + `disabled` derived from `findNextHardPlannedSession`.
- `src/screens/PlanScreen.tsx` — `onRegenerateWeek` callback + variant label + `onRestore` passed down.
- `src/screens/ImportScreen.tsx` — workouts from state; Approve / Needs review toggles per card; hidden file input + styled label.
- `src/screens/LogScreen.tsx` — controlled inputs; session select; validation; Saved toast; Recent logs panel.
- `src/screens/ProfileScreen.tsx` — Reset prototype data button at bottom.
- `src/components/CoachCard.tsx` — `onAction` and `disabled` props.
- `src/components/SessionCard.tsx` — optional `onRestore` prop; Restore link when `status === 'modified'`.
- `src/styles.css` — appended rules for new UI elements.
- `src/__tests__/app.test.tsx` — interaction tests for Save log, Approve, Apply easy version.

**Unchanged**
- `src/domain/types.ts`, `src/domain/planning.ts`, `src/services/localStore.ts`, `src/components/{LoadBalance,MetricRing}.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts`, `package.json`.

---

### Task 1: Plan Templates, Helpers, and AppState Types

**Files:**
- Create: `src/domain/planTemplates.ts`
- Create: `src/domain/appState.ts`
- Create: `src/domain/appState.test.ts`

This task introduces the data structures and pure helpers. No reducer logic yet — that lives in Task 2.

- [ ] **Step 1: Create the three plan variants**

Create `src/domain/planTemplates.ts`:

```ts
import { demoWeeklyPlan } from './demoData';
import type { WeeklyPlan } from './types';

const runningBiasPlan: WeeklyPlan = {
  weekLabel: 'May 20-26',
  sessions: [
    {
      id: 'mon-cf',
      day: 'Mon',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Quality lifting only, lighter metcon',
      durationMinutes: 45,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'tue-run',
      day: 'Tue',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Build durability without adding intensity',
      durationMinutes: 40,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'wed-run',
      day: 'Wed',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Extra aerobic volume',
      durationMinutes: 35,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'thu-quality',
      day: 'Thu',
      type: 'quality-run',
      title: 'Controlled intervals',
      purpose: 'Improve running speed with capped fatigue',
      durationMinutes: 50,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'sat-long',
      day: 'Sat',
      type: 'long-run',
      title: 'Long easy run',
      purpose: 'Extend aerobic base',
      durationMinutes: 75,
      intensity: 'low',
      status: 'planned'
    }
  ]
};

const liftingBiasPlan: WeeklyPlan = {
  weekLabel: 'May 20-26',
  sessions: [
    {
      id: 'mon-cf',
      day: 'Mon',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Heavy strength + metcon',
      durationMinutes: 70,
      intensity: 'high',
      status: 'planned',
      warning: 'Avoid hard running after this lower-body load.'
    },
    {
      id: 'tue-cf',
      day: 'Tue',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Gymnastics skill day',
      durationMinutes: 60,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'wed-run',
      day: 'Wed',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Recover legs between lifts',
      durationMinutes: 30,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'thu-cf',
      day: 'Thu',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Engine work',
      durationMinutes: 55,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'sat-long',
      day: 'Sat',
      type: 'long-run',
      title: 'Long easy run',
      purpose: 'Maintain aerobic base',
      durationMinutes: 45,
      intensity: 'low',
      status: 'planned'
    }
  ]
};

export const planTemplates = [demoWeeklyPlan, runningBiasPlan, liftingBiasPlan] as const;
export const variantLabels = ['base', 'running', 'lifting'] as const;
export type PlanVariantIndex = 0 | 1 | 2;
```

- [ ] **Step 2: Write failing tests for AppState helpers**

Create `src/domain/appState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { demoImportedWorkouts, demoWeeklyPlan } from './demoData';
import { findNextHardPlannedSession, initialAppState, nextEmptyDay } from './appState';
import { planTemplates } from './planTemplates';

describe('findNextHardPlannedSession', () => {
  it('returns the first planned session whose intensity is high', () => {
    const session = findNextHardPlannedSession(demoWeeklyPlan);
    expect(session?.id).toBe('mon-cf');
  });

  it('returns undefined when no planned session has high intensity', () => {
    const plan = {
      ...demoWeeklyPlan,
      sessions: demoWeeklyPlan.sessions.map((session) => ({ ...session, intensity: 'low' as const }))
    };
    expect(findNextHardPlannedSession(plan)).toBeUndefined();
  });

  it('skips sessions that are no longer planned', () => {
    const plan = {
      ...demoWeeklyPlan,
      sessions: demoWeeklyPlan.sessions.map((session) =>
        session.id === 'mon-cf' ? { ...session, status: 'completed' as const } : session
      )
    };
    expect(findNextHardPlannedSession(plan)).toBeUndefined();
  });
});

describe('nextEmptyDay', () => {
  it('returns the first day not already represented in workouts', () => {
    expect(nextEmptyDay(demoImportedWorkouts)).toBe('Tue');
  });

  it('falls back to Thu when every weekday day already has a workout', () => {
    const workouts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
      ...demoImportedWorkouts[0],
      id: `w-${day}`,
      day
    }));
    expect(nextEmptyDay(workouts)).toBe('Thu');
  });
});

describe('initialAppState', () => {
  it('starts on the today screen', () => {
    expect(initialAppState.activeScreen).toBe('today');
  });

  it('seeds plan from variant 0 (base)', () => {
    expect(initialAppState.plan).toBe(planTemplates[0]);
  });

  it('uses demo workouts and empty logs', () => {
    expect(initialAppState.workouts).toEqual(demoImportedWorkouts);
    expect(initialAppState.logs).toEqual([]);
    expect(initialAppState.planVariantIndex).toBe(0);
    expect(initialAppState.schemaVersion).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/domain/appState.test.ts
```

Expected: FAIL because `src/domain/appState.ts` does not exist yet.

- [ ] **Step 4: Implement AppState types, initialAppState, and helpers**

Create `src/domain/appState.ts`:

```ts
import { demoImportedWorkouts } from './demoData';
import { planTemplates, type PlanVariantIndex } from './planTemplates';
import type { ImportedWorkout, PlannedSession, TrainingLog, WeeklyPlan } from './types';

export type ScreenKey = 'today' | 'plan' | 'import' | 'log' | 'profile';

export interface AppState {
  activeScreen: ScreenKey;
  workouts: ImportedWorkout[];
  plan: WeeklyPlan;
  logs: TrainingLog[];
  planVariantIndex: PlanVariantIndex;
  schemaVersion: 1;
}

export const initialAppState: AppState = {
  activeScreen: 'today',
  workouts: demoImportedWorkouts,
  plan: planTemplates[0],
  logs: [],
  planVariantIndex: 0,
  schemaVersion: 1
};

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function findNextHardPlannedSession(plan: WeeklyPlan): PlannedSession | undefined {
  return plan.sessions.find((session) => session.intensity === 'high' && session.status === 'planned');
}

export function nextEmptyDay(workouts: ImportedWorkout[]): string {
  const used = new Set(workouts.map((workout) => workout.day));
  return dayOrder.find((day) => !used.has(day)) ?? 'Thu';
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/domain/appState.test.ts
```

Expected: PASS, 7 tests across 3 describes.

- [ ] **Step 6: Commit**

```
git add src/domain/planTemplates.ts src/domain/appState.ts src/domain/appState.test.ts
git commit -m "feat: add app state types, plan templates, and pure helpers"
```

Expected: commit succeeds.

---

### Task 2: Reducer (Action Vocabulary)

**Files:**
- Modify: `src/domain/appState.ts`
- Modify: `src/domain/appState.test.ts`

Adds the pure `appReducer` and its action type union. The reducer never touches `localStorage` or any other side-effect API.

- [ ] **Step 1: Add failing tests for each action**

Append to `src/domain/appState.test.ts` (keep existing tests):

```ts
import { appReducer } from './appState';
import type { TrainingLog } from './types';

describe('appReducer', () => {
  it('SET_ACTIVE_SCREEN updates activeScreen', () => {
    const next = appReducer(initialAppState, { type: 'SET_ACTIVE_SCREEN', screen: 'plan' });
    expect(next.activeScreen).toBe('plan');
  });

  it('APPROVE_WORKOUT flips reviewState to approved', () => {
    const next = appReducer(initialAppState, { type: 'APPROVE_WORKOUT', id: 'cf-wed' });
    expect(next.workouts.find((w) => w.id === 'cf-wed')?.reviewState).toBe('approved');
  });

  it('APPROVE_WORKOUT is a no-op for an unknown id', () => {
    const next = appReducer(initialAppState, { type: 'APPROVE_WORKOUT', id: 'does-not-exist' });
    expect(next.workouts).toEqual(initialAppState.workouts);
  });

  it('REJECT_WORKOUT sets reviewState back to needs-review', () => {
    const next = appReducer(initialAppState, { type: 'REJECT_WORKOUT', id: 'cf-mon' });
    expect(next.workouts.find((w) => w.id === 'cf-mon')?.reviewState).toBe('needs-review');
  });

  it('APPLY_EASY_VERSION easier flavor lowers intensity and marks session as modified', () => {
    const next = appReducer(initialAppState, { type: 'APPLY_EASY_VERSION', flavor: 'easier' });
    const monday = next.plan.sessions.find((s) => s.id === 'mon-cf');
    expect(monday?.intensity).toBe('low');
    expect(monday?.status).toBe('modified');
    expect(monday?.title.startsWith('Easier: ')).toBe(true);
  });

  it('APPLY_EASY_VERSION recovery flavor swaps the session to a recovery type', () => {
    const next = appReducer(initialAppState, { type: 'APPLY_EASY_VERSION', flavor: 'recovery' });
    const monday = next.plan.sessions.find((s) => s.id === 'mon-cf');
    expect(monday?.type).toBe('recovery');
    expect(monday?.intensity).toBe('low');
    expect(monday?.status).toBe('modified');
    expect(monday?.title).toBe('Recovery session');
  });

  it('APPLY_EASY_VERSION is a no-op when no eligible session exists', () => {
    const plan = {
      ...initialAppState.plan,
      sessions: initialAppState.plan.sessions.map((s) => ({ ...s, intensity: 'low' as const }))
    };
    const state = { ...initialAppState, plan };
    const next = appReducer(state, { type: 'APPLY_EASY_VERSION', flavor: 'easier' });
    expect(next.plan).toEqual(plan);
  });

  it('RESTORE_SESSION reverts a modified session to the variant template version', () => {
    const modified = appReducer(initialAppState, { type: 'APPLY_EASY_VERSION', flavor: 'easier' });
    const restored = appReducer(modified, { type: 'RESTORE_SESSION', sessionId: 'mon-cf' });
    const monday = restored.plan.sessions.find((s) => s.id === 'mon-cf');
    const original = initialAppState.plan.sessions.find((s) => s.id === 'mon-cf');
    expect(monday).toEqual(original);
  });

  it('RESTORE_SESSION is a no-op for an unknown session id', () => {
    const next = appReducer(initialAppState, { type: 'RESTORE_SESSION', sessionId: 'no-such-id' });
    expect(next.plan).toEqual(initialAppState.plan);
  });

  it('REGENERATE_WEEK cycles to the next variant', () => {
    const next = appReducer(initialAppState, { type: 'REGENERATE_WEEK' });
    expect(next.planVariantIndex).toBe(1);
    expect(next.plan.sessions[0].id).toBe('mon-cf');
  });

  it('REGENERATE_WEEK wraps from variant 2 back to 0', () => {
    const state = { ...initialAppState, planVariantIndex: 2 as const };
    const next = appReducer(state, { type: 'REGENERATE_WEEK' });
    expect(next.planVariantIndex).toBe(0);
  });

  it('ADD_UPLOADED_WORKOUT appends an imported workout with expected fields', () => {
    const next = appReducer(initialAppState, { type: 'ADD_UPLOADED_WORKOUT', fileName: 'screenshot.png' });
    expect(next.workouts.length).toBe(initialAppState.workouts.length + 1);
    const added = next.workouts[next.workouts.length - 1];
    expect(added.source).toBe('pushpress-screenshot');
    expect(added.reviewState).toBe('needs-review');
    expect(added.title).toBe('Uploaded: screenshot.png');
    expect(added.id.startsWith('uploaded-')).toBe(true);
  });

  it('SAVE_LOG appends to logs array', () => {
    const log: TrainingLog = {
      sessionId: 'mon-cf',
      completion: 'completed',
      rpe: 7,
      durationMinutes: 60,
      notes: 'felt good'
    };
    const next = appReducer(initialAppState, { type: 'SAVE_LOG', log });
    expect(next.logs).toEqual([log]);
  });

  it('RESET_TO_DEMO returns initial state', () => {
    const log: TrainingLog = { sessionId: 'mon-cf', completion: 'completed', rpe: 7, durationMinutes: 60, notes: '' };
    const dirty = appReducer(initialAppState, { type: 'SAVE_LOG', log });
    const reset = appReducer(dirty, { type: 'RESET_TO_DEMO' });
    expect(reset).toEqual(initialAppState);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/domain/appState.test.ts
```

Expected: FAIL because `appReducer` is not exported from `src/domain/appState.ts`.

- [ ] **Step 3: Implement the reducer**

Append to `src/domain/appState.ts`:

```ts
import { planTemplates } from './planTemplates';
import type { ImportedWorkout, PlannedSession, ReviewState } from './types';

export type AppAction =
  | { type: 'SET_ACTIVE_SCREEN'; screen: ScreenKey }
  | { type: 'APPROVE_WORKOUT'; id: string }
  | { type: 'REJECT_WORKOUT'; id: string }
  | { type: 'APPLY_EASY_VERSION'; flavor: 'easier' | 'recovery' }
  | { type: 'RESTORE_SESSION'; sessionId: string }
  | { type: 'REGENERATE_WEEK' }
  | { type: 'ADD_UPLOADED_WORKOUT'; fileName: string }
  | { type: 'SAVE_LOG'; log: TrainingLog }
  | { type: 'RESET_TO_DEMO' };

function setReviewState(workouts: ImportedWorkout[], id: string, reviewState: ReviewState): ImportedWorkout[] {
  let changed = false;
  const next = workouts.map((workout) => {
    if (workout.id !== id) return workout;
    changed = true;
    return { ...workout, reviewState };
  });
  return changed ? next : workouts;
}

function applyEasier(session: PlannedSession): PlannedSession {
  if (session.title.startsWith('Easier: ')) {
    return { ...session, intensity: 'low', status: 'modified' };
  }
  return {
    ...session,
    intensity: 'low',
    status: 'modified',
    title: `Easier: ${session.title}`
  };
}

function applyRecovery(session: PlannedSession): PlannedSession {
  return {
    ...session,
    type: 'recovery',
    title: 'Recovery session',
    purpose: 'Pain flagged — keep training conservative',
    intensity: 'low',
    status: 'modified'
  };
}

function uploadedWorkoutId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `uploaded-${crypto.randomUUID()}`;
  }
  return `uploaded-${Date.now().toString(36)}`;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_SCREEN':
      return { ...state, activeScreen: action.screen };

    case 'APPROVE_WORKOUT': {
      const workouts = setReviewState(state.workouts, action.id, 'approved');
      return workouts === state.workouts ? state : { ...state, workouts };
    }

    case 'REJECT_WORKOUT': {
      const workouts = setReviewState(state.workouts, action.id, 'needs-review');
      return workouts === state.workouts ? state : { ...state, workouts };
    }

    case 'APPLY_EASY_VERSION': {
      const target = findNextHardPlannedSession(state.plan);
      if (!target) return state;
      const transform = action.flavor === 'recovery' ? applyRecovery : applyEasier;
      const sessions = state.plan.sessions.map((session) =>
        session.id === target.id ? transform(session) : session
      );
      return { ...state, plan: { ...state.plan, sessions } };
    }

    case 'RESTORE_SESSION': {
      const template = planTemplates[state.planVariantIndex];
      const originalSession = template.sessions.find((s) => s.id === action.sessionId);
      if (!originalSession) return state;
      const sessions = state.plan.sessions.map((session) =>
        session.id === action.sessionId ? { ...originalSession } : session
      );
      return { ...state, plan: { ...state.plan, sessions } };
    }

    case 'REGENERATE_WEEK': {
      const nextIndex = ((state.planVariantIndex + 1) % 3) as PlanVariantIndex;
      return { ...state, planVariantIndex: nextIndex, plan: planTemplates[nextIndex] };
    }

    case 'ADD_UPLOADED_WORKOUT': {
      const day = nextEmptyDay(state.workouts);
      const workout: ImportedWorkout = {
        id: uploadedWorkoutId(),
        day,
        source: 'pushpress-screenshot',
        title: `Uploaded: ${action.fileName}`,
        extractedText:
          'Uploaded image processed in prototype mode. Real OCR runs through a future backend.',
        confidence: 0.65,
        reviewState: 'needs-review',
        lowerBodyLoad: 'moderate',
        metconIntensity: 'moderate',
        fatigueImpact: 'moderate',
        tags: [{ label: 'imported', level: 'moderate' }]
      };
      return { ...state, workouts: [...state.workouts, workout] };
    }

    case 'SAVE_LOG':
      return { ...state, logs: [...state.logs, action.log] };

    case 'RESET_TO_DEMO':
      return initialAppState;

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/domain/appState.test.ts
```

Expected: PASS, all reducer and helper tests green.

- [ ] **Step 5: Commit**

```
git add src/domain/appState.ts src/domain/appState.test.ts
git commit -m "feat: add pure reducer for app state actions"
```

Expected: commit succeeds.

---

### Task 3: Persistence Layer

**Files:**
- Create: `src/services/appPersistence.ts`
- Create: `src/services/appPersistence.test.ts`

Wraps `localStore` with schema versioning and the legacy-key migration.

- [ ] **Step 1: Write failing tests**

Create `src/services/appPersistence.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initialAppState } from '../domain/appState';
import { loadAppState, saveAppState } from './appPersistence';

const STATE_KEY = 'hybrid-coach-state-v1';
const LEGACY_KEY = 'hybrid-coach-active-screen';

describe('appPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns initial state when storage is empty', () => {
    expect(loadAppState()).toEqual(initialAppState);
  });

  it('round-trips the full state through localStorage', () => {
    const next = { ...initialAppState, activeScreen: 'plan' as const };
    saveAppState(next);
    expect(loadAppState()).toEqual(next);
  });

  it('returns initial state when stored JSON is corrupt', () => {
    window.localStorage.setItem(STATE_KEY, 'not json');
    expect(loadAppState()).toEqual(initialAppState);
  });

  it('returns initial state when schemaVersion does not match', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ ...initialAppState, schemaVersion: 0 })
    );
    expect(loadAppState()).toEqual(initialAppState);
  });

  it('migrates the legacy active-screen key on first load', () => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify('profile'));
    const loaded = loadAppState();
    expect(loaded.activeScreen).toBe('profile');
    expect(loaded.workouts).toEqual(initialAppState.workouts);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/services/appPersistence.test.ts
```

Expected: FAIL because `appPersistence.ts` does not exist.

- [ ] **Step 3: Implement persistence**

Create `src/services/appPersistence.ts`:

```ts
import { initialAppState, type AppState, type ScreenKey } from '../domain/appState';
import { loadLocalValue, saveLocalValue } from './localStore';

const STATE_KEY = 'hybrid-coach-state-v1';
const LEGACY_SCREEN_KEY = 'hybrid-coach-active-screen';
const SCREEN_KEYS: readonly ScreenKey[] = ['today', 'plan', 'import', 'log', 'profile'];

function isScreenKey(value: unknown): value is ScreenKey {
  return typeof value === 'string' && (SCREEN_KEYS as readonly string[]).includes(value);
}

function migrateLegacyScreen(): AppState {
  const stored = loadLocalValue<unknown>(LEGACY_SCREEN_KEY, null);
  const activeScreen = isScreenKey(stored) ? stored : initialAppState.activeScreen;
  return { ...initialAppState, activeScreen };
}

export function loadAppState(): AppState {
  const raw = loadLocalValue<unknown>(STATE_KEY, null);
  if (raw === null) {
    return migrateLegacyScreen();
  }
  if (typeof raw !== 'object' || raw === null) {
    return initialAppState;
  }
  const candidate = raw as Partial<AppState>;
  if (candidate.schemaVersion !== 1) {
    return initialAppState;
  }
  return { ...initialAppState, ...candidate } as AppState;
}

export function saveAppState(state: AppState): boolean {
  return saveLocalValue(STATE_KEY, state);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/services/appPersistence.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```
git add src/services/appPersistence.ts src/services/appPersistence.test.ts
git commit -m "feat: add persistence layer with schema versioning and legacy migration"
```

Expected: commit succeeds.

---

### Task 4: Wire App.tsx to Reducer and Persistence

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/__tests__/app.test.tsx`

Replaces the `useState<ScreenKey>` with a `useReducer` + persistence effect. Existing screens get the same data they had before — props change only for `ImportScreen` (workouts now from state).

- [ ] **Step 1: Replace App.tsx with the reducer-backed shell**

Overwrite `src/App.tsx`:

```tsx
import { useEffect, useReducer } from 'react';
import { AppChrome, type ScreenKey } from './components/AppChrome';
import { appReducer, initialAppState } from './domain/appState';
import { demoProfile, demoReadiness, demoRecommendations } from './domain/demoData';
import { protectRunsAfterHeavyLowerBody } from './domain/planning';
import { ImportScreen } from './screens/ImportScreen';
import { LogScreen } from './screens/LogScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TodayScreen } from './screens/TodayScreen';
import { loadAppState, saveAppState } from './services/appPersistence';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppState);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const protectedPlan = protectRunsAfterHeavyLowerBody(state.plan, state.workouts);

  function navigate(screen: ScreenKey) {
    dispatch({ type: 'SET_ACTIVE_SCREEN', screen });
  }

  return (
    <AppChrome activeScreen={state.activeScreen} onNavigate={navigate}>
      {state.activeScreen === 'today' ? (
        <TodayScreen plan={protectedPlan} readiness={demoReadiness} recommendation={demoRecommendations[0]} />
      ) : null}
      {state.activeScreen === 'plan' ? <PlanScreen plan={protectedPlan} /> : null}
      {state.activeScreen === 'import' ? <ImportScreen workouts={state.workouts} /> : null}
      {state.activeScreen === 'log' ? <LogScreen plan={protectedPlan} logs={state.logs} /> : null}
      {state.activeScreen === 'profile' ? <ProfileScreen profile={demoProfile} /> : null}
    </AppChrome>
  );
}
```

Note: `LogScreen` and `ImportScreen` get new props (`plan`, `logs`, `workouts`). Their components don't accept these yet — Step 2 patches existing tests to keep passing despite this; Tasks 8–10 wire the screens fully.

- [ ] **Step 2: Patch existing LogScreen and ImportScreen to accept (but ignore) new props**

Modify `src/screens/ImportScreen.tsx` — change the existing props interface to accept `workouts` (already does) — no edit needed, the existing signature already takes `workouts`.

Modify `src/screens/LogScreen.tsx`. Replace the file contents with:

```tsx
import type { PlannedSession, TrainingLog, WeeklyPlan } from '../domain/types';

interface LogScreenProps {
  plan: WeeklyPlan;
  logs: TrainingLog[];
}

export function LogScreen(_props: LogScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Log</p>
          <h1>Fast post-workout check-in.</h1>
        </div>
      </header>
      <form className="panel log-form">
        <label>
          Session result
          <select defaultValue="completed">
            <option value="completed">Completed</option>
            <option value="modified">Modified</option>
            <option value="skipped">Skipped</option>
            <option value="moved">Moved</option>
          </select>
        </label>
        <label>
          RPE
          <input type="range" min="1" max="10" defaultValue="7" />
        </label>
        <label>
          Duration
          <input type="number" min="0" defaultValue="45" />
        </label>
        <label>
          Notes
          <textarea rows={4} placeholder="What changed, what felt good, what felt risky?" />
        </label>
        <button type="button" className="primary-action">Save log</button>
      </form>
    </div>
  );
}
```

The unused-import warning for `PlannedSession` is acceptable temporarily; Task 9 removes it by using the type. To keep TS strict happy now, leave `PlannedSession` out of the import:

```tsx
import type { TrainingLog, WeeklyPlan } from '../domain/types';
```

- [ ] **Step 3: Confirm existing app tests still pass**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/__tests__/app.test.tsx
```

Expected: PASS — the three existing tests (Today render, navigate to import, navigate to profile) still pass. localStorage between tests should be clean because jsdom resets per test file, but to be safe, add a `beforeEach` cleanup. Modify `src/__tests__/app.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders Today as the focused first screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /make the next session count/i })).toBeInTheDocument();
    expect(screen.getByText(/keep tuesday easy/i)).toBeInTheDocument();
  });

  it('navigates to the import review screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /import/i })[0]);

    expect(screen.getByRole('heading', { name: /review gym programming/i })).toBeInTheDocument();
    expect(screen.getByText(/back squat/i)).toBeInTheDocument();
  });

  it('navigates to the profile privacy context', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);

    expect(screen.getByRole('heading', { name: /kai's training context/i })).toBeInTheDocument();
    expect(screen.getByText(/secure backend/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run all tests to confirm nothing regressed**

Run:
```
node ./node_modules/vitest/vitest.mjs run
```

Expected: PASS, all test files green.

- [ ] **Step 5: Typecheck and build**

Run:
```
node ./node_modules/typescript/bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/App.tsx src/screens/LogScreen.tsx src/__tests__/app.test.tsx
git commit -m "feat: drive App.tsx via useReducer and persistence"
```

Expected: commit succeeds.

---

### Task 5: Approve / Needs Review Buttons (Import Screen)

**Files:**
- Modify: `src/screens/ImportScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/__tests__/app.test.tsx`

Replaces the static status chip with two toggle buttons. Smallest visible UI change — good first wire-up.

- [ ] **Step 1: Add the failing interaction test**

Append to `src/__tests__/app.test.tsx` inside the `describe('App', ...)` block:

```tsx
  it('toggles the review state of an imported workout', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /import/i })[0]);

    const card = screen.getByText('Gymnastics skill + engine').closest('article');
    expect(card).not.toBeNull();
    const approveButton = within(card as HTMLElement).getByRole('button', { name: /approve/i });

    await user.click(approveButton);

    expect(approveButton).toHaveAttribute('aria-pressed', 'true');
  });
```

At the top of the file, add `within` to the testing-library import:

```tsx
import { render, screen, within } from '@testing-library/react';
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/__tests__/app.test.tsx -t "toggles the review state"
```

Expected: FAIL — there is no Approve button yet.

- [ ] **Step 3: Update ImportScreen to render toggle buttons**

Overwrite `src/screens/ImportScreen.tsx`:

```tsx
import { CheckCircle2, RotateCcw, UploadCloud } from 'lucide-react';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ImportScreen({ workouts, onApprove, onReject }: ImportScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <button type="button" className="primary-action icon-action">
          <UploadCloud aria-hidden="true" /> Upload screenshot
        </button>
      </header>
      <div className="grid">
        {workouts.map((workout) => {
          const isApproved = workout.reviewState === 'approved';
          return (
            <article className="panel import-card" key={workout.id}>
              <div>
                <p className="eyebrow">{workout.day} PushPress</p>
                <h2>{workout.title}</h2>
                <p>{workout.extractedText}</p>
              </div>
              <div className="tag-row">
                {workout.tags.map((tag) => (
                  <span className={`intensity-chip ${tag.level}`} key={tag.label}>{tag.label}</span>
                ))}
              </div>
              <div className="import-footer">
                <span className="status-chip">{Math.round(workout.confidence * 100)}% confidence</span>
                <div className="review-toggle" role="group" aria-label={`Review state for ${workout.title}`}>
                  <button
                    type="button"
                    className={`review-button approve ${isApproved ? 'is-active' : ''}`}
                    aria-pressed={isApproved}
                    onClick={() => onApprove(workout.id)}
                  >
                    <CheckCircle2 aria-hidden="true" /> Approve
                  </button>
                  <button
                    type="button"
                    className={`review-button reject ${!isApproved ? 'is-active' : ''}`}
                    aria-pressed={!isApproved}
                    onClick={() => onReject(workout.id)}
                  >
                    <RotateCcw aria-hidden="true" /> Needs review
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire callbacks in App.tsx**

Modify `src/App.tsx`. Replace the ImportScreen render line:

```tsx
      {state.activeScreen === 'import' ? (
        <ImportScreen
          workouts={state.workouts}
          onApprove={(id) => dispatch({ type: 'APPROVE_WORKOUT', id })}
          onReject={(id) => dispatch({ type: 'REJECT_WORKOUT', id })}
        />
      ) : null}
```

- [ ] **Step 5: Add CSS for the toggle**

Append to `src/styles.css`:

```css
.review-toggle {
  display: inline-flex;
  gap: 0.4rem;
}

.review-button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #cbd5e1;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 800;
}

.review-button svg {
  width: 0.95rem;
  height: 0.95rem;
}

.review-button.approve.is-active {
  border-color: transparent;
  color: #07110d;
  background: #7ee0b2;
}

.review-button.reject.is-active {
  border-color: transparent;
  color: #2a1300;
  background: #ffd27a;
}
```

- [ ] **Step 6: Run the new test and the full suite**

Run:
```
node ./node_modules/vitest/vitest.mjs run
```

Expected: PASS — including the new toggle test.

- [ ] **Step 7: Commit**

```
git add src/screens/ImportScreen.tsx src/App.tsx src/styles.css src/__tests__/app.test.tsx
git commit -m "feat: wire approve and needs-review toggles on import workouts"
```

Expected: commit succeeds.

---

### Task 6: Apply Easy Version Button + Restore Link

**Files:**
- Modify: `src/components/CoachCard.tsx`
- Modify: `src/components/SessionCard.tsx`
- Modify: `src/screens/TodayScreen.tsx`
- Modify: `src/screens/PlanScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/__tests__/app.test.tsx`

Wires Apply easy version on the CoachCard and adds the inline Restore link to modified SessionCards.

- [ ] **Step 1: Add the failing interaction test**

Append inside `describe('App', ...)`:

```tsx
  it('applies an easier version of the next hard session and lets the user restore it', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(/crossfit class/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /apply easy version/i }));

    expect(screen.getByText(/easier: crossfit class/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /restore/i }));

    expect(screen.queryByText(/easier: crossfit class/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/crossfit class/i).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/__tests__/app.test.tsx -t "applies an easier version"
```

Expected: FAIL — clicking the button does nothing yet.

- [ ] **Step 3: Update CoachCard to accept callback + disabled state**

Overwrite `src/components/CoachCard.tsx`:

```tsx
import { ShieldAlert, Sparkles } from 'lucide-react';
import type { CoachRecommendation } from '../domain/types';

interface CoachCardProps {
  recommendation: CoachRecommendation;
  onAction?: () => void;
  disabled?: boolean;
}

export function CoachCard({ recommendation, onAction, disabled }: CoachCardProps) {
  const isRecovery = recommendation.severity === 'recovery' || recommendation.severity === 'caution';
  const Icon = isRecovery ? ShieldAlert : Sparkles;

  return (
    <section className={`coach-card ${recommendation.severity}`}>
      <div className="coach-card__icon">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">Coach signal</p>
        <h2>{recommendation.title}</h2>
        <p>{recommendation.body}</p>
        <button
          type="button"
          className="primary-action"
          onClick={onAction}
          disabled={disabled || !onAction}
        >
          {recommendation.actionLabel}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update SessionCard to render the Restore link**

Overwrite `src/components/SessionCard.tsx`:

```tsx
import { AlertTriangle, Clock3 } from 'lucide-react';
import type { PlannedSession } from '../domain/types';

interface SessionCardProps {
  session: PlannedSession;
  onRestore?: (sessionId: string) => void;
}

export function SessionCard({ session, onRestore }: SessionCardProps) {
  const isModified = session.status === 'modified';
  return (
    <article className={`session-card ${session.type}`}>
      <div className="session-card__header">
        <div>
          <span className="session-day">{session.day}</span>
          <h3>{session.title}</h3>
        </div>
        <span className={`intensity-chip ${session.intensity}`}>{session.intensity}</span>
      </div>
      <p>{session.purpose}</p>
      <div className="session-meta">
        <span>
          <Clock3 aria-hidden="true" />
          {session.durationMinutes} min
        </span>
        <span>{session.type.replace('-', ' ')}</span>
      </div>
      {session.warning ? (
        <div className="warning-line">
          <AlertTriangle aria-hidden="true" />
          <span>{session.warning}</span>
        </div>
      ) : null}
      {isModified && onRestore ? (
        <button type="button" className="restore-link" onClick={() => onRestore(session.id)}>
          Restore
        </button>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 5: Update TodayScreen to compute disabled and dispatch**

Overwrite `src/screens/TodayScreen.tsx`:

```tsx
import { CoachCard } from '../components/CoachCard';
import { LoadBalance } from '../components/LoadBalance';
import { MetricRing } from '../components/MetricRing';
import { SessionCard } from '../components/SessionCard';
import type { CoachRecommendation, PlannedSession, ReadinessCheckIn, WeeklyPlan } from '../domain/types';
import { calculateReadinessScore, getWeeklyBalance } from '../domain/planning';
import { findNextHardPlannedSession } from '../domain/appState';

interface TodayScreenProps {
  plan: WeeklyPlan;
  readiness: ReadinessCheckIn;
  recommendation: CoachRecommendation;
  onApplyEasyVersion: () => void;
  onRestore: (sessionId: string) => void;
}

export function TodayScreen({ plan, readiness, recommendation, onApplyEasyVersion, onRestore }: TodayScreenProps) {
  const nextSession = plan.sessions.find((session) => session.status === 'planned' || session.status === 'modified') as PlannedSession;
  const readinessScore = calculateReadinessScore(readiness);
  const balance = getWeeklyBalance(plan);
  const canApplyEasy = findNextHardPlannedSession(plan) !== undefined;

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Make the next session count.</h1>
        </div>
        <MetricRing label="Readiness" value={readinessScore} />
      </header>
      <div className="grid two">
        <div className="grid">
          <CoachCard
            recommendation={recommendation}
            onAction={onApplyEasyVersion}
            disabled={!canApplyEasy}
          />
          <SessionCard session={nextSession} onRestore={onRestore} />
        </div>
        <LoadBalance
          crossfitSessions={balance.crossfitSessions}
          runSessions={balance.runSessions}
          hardSessions={balance.hardSessions}
          label={balance.balanceLabel}
        />
      </div>
    </div>
  );
}
```

Note: `nextSession` now picks the first session that is `planned` OR `modified` so that an "Easier:" session still shows up after Apply.

- [ ] **Step 6: Update PlanScreen to pass onRestore down**

Modify `src/screens/PlanScreen.tsx`:

```tsx
import { SessionCard } from '../components/SessionCard';
import type { WeeklyPlan } from '../domain/types';

interface PlanScreenProps {
  plan: WeeklyPlan;
  onRestore: (sessionId: string) => void;
}

export function PlanScreen({ plan, onRestore }: PlanScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>{plan.weekLabel}</h1>
        </div>
        <button type="button" className="secondary-action">Regenerate week</button>
      </header>
      <div className="grid three">
        {plan.sessions.map((session) => (
          <SessionCard key={session.id} session={session} onRestore={onRestore} />
        ))}
      </div>
    </div>
  );
}
```

The Regenerate button stays inert in this task; Task 7 wires it.

- [ ] **Step 7: Wire Apply + Restore in App.tsx**

In `src/App.tsx`, derive a flavor from the current recommendation and add callbacks. Replace the Today and Plan render lines:

```tsx
      {state.activeScreen === 'today' ? (
        <TodayScreen
          plan={protectedPlan}
          readiness={demoReadiness}
          recommendation={demoRecommendations[0]}
          onApplyEasyVersion={() =>
            dispatch({
              type: 'APPLY_EASY_VERSION',
              flavor: demoRecommendations[0].id === 'pain-flag' ? 'recovery' : 'easier'
            })
          }
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
        />
      ) : null}
      {state.activeScreen === 'plan' ? (
        <PlanScreen
          plan={protectedPlan}
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
        />
      ) : null}
```

- [ ] **Step 8: Add CSS for the Restore link**

Append to `src/styles.css`:

```css
.restore-link {
  margin-top: 0.6rem;
  padding: 0;
  border: 0;
  color: #7ee0b2;
  background: transparent;
  font-weight: 700;
  text-decoration: underline;
}

.primary-action:disabled {
  cursor: not-allowed;
  filter: grayscale(0.4);
  opacity: 0.55;
}
```

- [ ] **Step 9: Run all tests**

Run:
```
node ./node_modules/vitest/vitest.mjs run
```

Expected: PASS — including the new apply-and-restore test.

- [ ] **Step 10: Commit**

```
git add src/components/CoachCard.tsx src/components/SessionCard.tsx src/screens/TodayScreen.tsx src/screens/PlanScreen.tsx src/App.tsx src/styles.css src/__tests__/app.test.tsx
git commit -m "feat: wire apply-easy-version and per-session restore"
```

Expected: commit succeeds.

---

### Task 7: Regenerate Week Button

**Files:**
- Modify: `src/screens/PlanScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

Cycles the plan variant on click; shows the current variant label.

- [ ] **Step 1: Update PlanScreen with variant label and onRegenerateWeek prop**

Overwrite `src/screens/PlanScreen.tsx`:

```tsx
import { SessionCard } from '../components/SessionCard';
import type { WeeklyPlan } from '../domain/types';
import { variantLabels, type PlanVariantIndex } from '../domain/planTemplates';

interface PlanScreenProps {
  plan: WeeklyPlan;
  variantIndex: PlanVariantIndex;
  onRegenerateWeek: () => void;
  onRestore: (sessionId: string) => void;
}

export function PlanScreen({ plan, variantIndex, onRegenerateWeek, onRestore }: PlanScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>{plan.weekLabel}</h1>
        </div>
        <div className="plan-header-actions">
          <span className="variant-pill">Variant: {variantLabels[variantIndex]}</span>
          <button type="button" className="secondary-action" onClick={onRegenerateWeek}>
            Regenerate week
          </button>
        </div>
      </header>
      <div className="grid three">
        {plan.sessions.map((session) => (
          <SessionCard key={session.id} session={session} onRestore={onRestore} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the callback in App.tsx**

Modify `src/App.tsx` PlanScreen render:

```tsx
      {state.activeScreen === 'plan' ? (
        <PlanScreen
          plan={protectedPlan}
          variantIndex={state.planVariantIndex}
          onRegenerateWeek={() => dispatch({ type: 'REGENERATE_WEEK' })}
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
        />
      ) : null}
```

- [ ] **Step 3: Add CSS for the variant pill**

Append to `src/styles.css`:

```css
.plan-header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.variant-pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #aab5c5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
}

@media (max-width: 900px) {
  .plan-header-actions {
    justify-content: flex-start;
  }
}
```

- [ ] **Step 4: Typecheck and run tests**

Run:
```
node ./node_modules/typescript/bin/tsc --noEmit && node ./node_modules/vitest/vitest.mjs run
```

Expected: typecheck passes; all tests still green.

- [ ] **Step 5: Commit**

```
git add src/screens/PlanScreen.tsx src/App.tsx src/styles.css
git commit -m "feat: wire regenerate-week button with variant cycling"
```

Expected: commit succeeds.

---

### Task 8: Upload Screenshot

**Files:**
- Modify: `src/screens/ImportScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

Hides the native file input behind a styled label so the button stays consistent with the rest of the UI.

- [ ] **Step 1: Update ImportScreen with hidden file input**

Overwrite `src/screens/ImportScreen.tsx`:

```tsx
import { CheckCircle2, RotateCcw, UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpload: (fileName: string) => void;
}

export function ImportScreen({ workouts, onApprove, onReject, onUpload }: ImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file.name);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <label className="primary-action icon-action upload-button">
          <UploadCloud aria-hidden="true" /> Upload screenshot
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="visually-hidden"
            onChange={handleFileChange}
          />
        </label>
      </header>
      <div className="grid">
        {workouts.map((workout) => {
          const isApproved = workout.reviewState === 'approved';
          return (
            <article className="panel import-card" key={workout.id}>
              <div>
                <p className="eyebrow">{workout.day} PushPress</p>
                <h2>{workout.title}</h2>
                <p>{workout.extractedText}</p>
              </div>
              <div className="tag-row">
                {workout.tags.map((tag) => (
                  <span className={`intensity-chip ${tag.level}`} key={tag.label}>{tag.label}</span>
                ))}
              </div>
              <div className="import-footer">
                <span className="status-chip">{Math.round(workout.confidence * 100)}% confidence</span>
                <div className="review-toggle" role="group" aria-label={`Review state for ${workout.title}`}>
                  <button
                    type="button"
                    className={`review-button approve ${isApproved ? 'is-active' : ''}`}
                    aria-pressed={isApproved}
                    onClick={() => onApprove(workout.id)}
                  >
                    <CheckCircle2 aria-hidden="true" /> Approve
                  </button>
                  <button
                    type="button"
                    className={`review-button reject ${!isApproved ? 'is-active' : ''}`}
                    aria-pressed={!isApproved}
                    onClick={() => onReject(workout.id)}
                  >
                    <RotateCcw aria-hidden="true" /> Needs review
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire callback in App.tsx**

Modify the ImportScreen render:

```tsx
      {state.activeScreen === 'import' ? (
        <ImportScreen
          workouts={state.workouts}
          onApprove={(id) => dispatch({ type: 'APPROVE_WORKOUT', id })}
          onReject={(id) => dispatch({ type: 'REJECT_WORKOUT', id })}
          onUpload={(fileName) => dispatch({ type: 'ADD_UPLOADED_WORKOUT', fileName })}
        />
      ) : null}
```

- [ ] **Step 3: Add CSS for hidden input and label-button**

Append to `src/styles.css`:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}
```

- [ ] **Step 4: Typecheck and run tests**

Run:
```
node ./node_modules/typescript/bin/tsc --noEmit && node ./node_modules/vitest/vitest.mjs run
```

Expected: typecheck passes; all tests still green.

- [ ] **Step 5: Commit**

```
git add src/screens/ImportScreen.tsx src/App.tsx src/styles.css
git commit -m "feat: wire upload-screenshot to add a canned workout"
```

Expected: commit succeeds.

---

### Task 9: Save Log

**Files:**
- Modify: `src/screens/LogScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/__tests__/app.test.tsx`

Most complex single task. Converts the form to controlled inputs, adds a session select, validates, dispatches, shows a Saved toast, and renders a Recent logs panel.

- [ ] **Step 1: Add failing interaction test**

Append inside `describe('App', ...)`:

```tsx
  it('saves a log entry and shows it in the Recent logs panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /^log$/i })[0]);

    const sessionSelect = screen.getByLabelText(/which session/i);
    await user.selectOptions(sessionSelect, 'mon-cf');

    const durationInput = screen.getByLabelText(/duration/i) as HTMLInputElement;
    await user.clear(durationInput);
    await user.type(durationInput, '62');

    const notes = screen.getByLabelText(/notes/i);
    await user.type(notes, 'felt strong');

    await user.click(screen.getByRole('button', { name: /save log/i }));

    expect(screen.getByText(/saved/i)).toBeInTheDocument();
    expect(screen.getByText(/recent logs/i)).toBeInTheDocument();
    expect(screen.getByText(/felt strong|crossfit class/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```
node ./node_modules/vitest/vitest.mjs run src/__tests__/app.test.tsx -t "saves a log entry"
```

Expected: FAIL — no session selector exists yet.

- [ ] **Step 3: Implement the new LogScreen**

Overwrite `src/screens/LogScreen.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { CompletionState, TrainingLog, WeeklyPlan } from '../domain/types';

interface LogScreenProps {
  plan: WeeklyPlan;
  logs: TrainingLog[];
  onSaveLog: (log: TrainingLog) => void;
}

const COMPLETION_OPTIONS: { value: CompletionState; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'modified', label: 'Modified' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'moved', label: 'Moved' }
];

export function LogScreen({ plan, logs, onSaveLog }: LogScreenProps) {
  const [sessionId, setSessionId] = useState<string>(plan.sessions[0]?.id ?? '');
  const [completion, setCompletion] = useState<CompletionState>('completed');
  const [rpe, setRpe] = useState(7);
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (!savedFlag) return;
    const timeout = window.setTimeout(() => setSavedFlag(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedFlag]);

  const isValid = sessionId !== '' && rpe >= 1 && rpe <= 10 && duration >= 0;

  function handleSave() {
    if (!isValid) return;
    onSaveLog({ sessionId, completion, rpe, durationMinutes: duration, notes });
    setSavedFlag(true);
    setCompletion('completed');
    setRpe(7);
    setDuration(45);
    setNotes('');
  }

  const recentLogs = logs.slice(-3).reverse();
  const sessionLookup = new Map(plan.sessions.map((session) => [session.id, session]));

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Log</p>
          <h1>Fast post-workout check-in.</h1>
        </div>
      </header>
      <form className="panel log-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Which session
          <select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
            {plan.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.day} — {session.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Session result
          <select value={completion} onChange={(event) => setCompletion(event.target.value as CompletionState)}>
            {COMPLETION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          RPE ({rpe})
          <input
            type="range"
            min="1"
            max="10"
            value={rpe}
            onChange={(event) => setRpe(Number(event.target.value))}
          />
        </label>
        <label>
          Duration
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
        </label>
        <label>
          Notes
          <textarea
            rows={4}
            placeholder="What changed, what felt good, what felt risky?"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="log-actions">
          <button
            type="button"
            className="primary-action"
            onClick={handleSave}
            disabled={!isValid}
          >
            Save log
          </button>
          <span className={`saved-flag ${savedFlag ? 'is-visible' : ''}`} aria-live="polite">
            Saved
          </span>
        </div>
      </form>
      <section className="panel recent-logs" aria-label="Recent logs">
        <p className="eyebrow">Recent logs</p>
        {recentLogs.length === 0 ? (
          <p className="recent-logs__empty">No logs yet. Save your first session above.</p>
        ) : (
          <ul>
            {recentLogs.map((log, index) => {
              const session = sessionLookup.get(log.sessionId);
              return (
                <li key={`${log.sessionId}-${index}`}>
                  <strong>{session ? session.title : log.sessionId}</strong>
                  <span>{log.completion} · RPE {log.rpe} · {log.durationMinutes} min</span>
                  {log.notes ? <p>{log.notes}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire the dispatch in App.tsx**

Modify the LogScreen render line:

```tsx
      {state.activeScreen === 'log' ? (
        <LogScreen
          plan={protectedPlan}
          logs={state.logs}
          onSaveLog={(log) => dispatch({ type: 'SAVE_LOG', log })}
        />
      ) : null}
```

- [ ] **Step 5: Add CSS for Saved toast and Recent logs**

Append to `src/styles.css`:

```css
.log-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.saved-flag {
  color: #7ee0b2;
  font-weight: 700;
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.saved-flag.is-visible {
  opacity: 1;
}

.recent-logs {
  margin-top: 1rem;
}

.recent-logs ul {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recent-logs li {
  display: grid;
  gap: 0.25rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #aab5c5;
}

.recent-logs li:last-child {
  border-bottom: 0;
}

.recent-logs strong {
  color: #ecf2ff;
}

.recent-logs__empty {
  margin: 0.4rem 0 0;
  color: #aab5c5;
}
```

- [ ] **Step 6: Run tests**

Run:
```
node ./node_modules/vitest/vitest.mjs run
```

Expected: PASS, including the new save-log test.

- [ ] **Step 7: Commit**

```
git add src/screens/LogScreen.tsx src/App.tsx src/styles.css src/__tests__/app.test.tsx
git commit -m "feat: wire save log with session select, validation, and recent logs panel"
```

Expected: commit succeeds.

---

### Task 10: Reset Prototype Data

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

A destructive-styled button on Profile with a native `confirm()` gate.

- [ ] **Step 1: Update ProfileScreen with the Reset button**

Overwrite `src/screens/ProfileScreen.tsx`:

```tsx
import type { AthleteProfile } from '../domain/types';

interface ProfileScreenProps {
  profile: AthleteProfile;
  onReset: () => void;
}

export function ProfileScreen({ profile, onReset }: ProfileScreenProps) {
  function handleReset() {
    const confirmed = window.confirm(
      'This clears all your saved logs, approvals, and plan changes. Continue?'
    );
    if (confirmed) {
      onReset();
    }
  }

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{profile.name}'s training context.</h1>
        </div>
      </header>
      <div className="grid two">
        <section className="profile-card">
          <h2>Goal</h2>
          <p>{profile.currentGoal}</p>
          <p>{profile.runningBaseline}</p>
        </section>
        <section className="profile-card">
          <h2>PRs</h2>
          <div className="profile-list">
            {profile.prs.map((pr) => (
              <span key={pr.lift}>
                <strong>{pr.lift}</strong>
                {pr.value}
              </span>
            ))}
          </div>
        </section>
        <section className="profile-card">
          <h2>Availability</h2>
          <div className="profile-list">
            {profile.weeklyAvailability.map((window) => (
              <span key={window.day}>
                <strong>{window.day}</strong>
                {window.available ? `${window.minutes} min` : 'Rest / unavailable'}
              </span>
            ))}
          </div>
        </section>
        <section className="profile-card">
          <h2>Privacy mode</h2>
          <p>Prototype data stays in this browser. AI extraction and account sync require a secure backend later.</p>
        </section>
      </div>
      <div className="reset-row">
        <button type="button" className="destructive-action" onClick={handleReset}>
          Reset prototype data
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the dispatch in App.tsx**

Modify the ProfileScreen render line:

```tsx
      {state.activeScreen === 'profile' ? (
        <ProfileScreen
          profile={demoProfile}
          onReset={() => dispatch({ type: 'RESET_TO_DEMO' })}
        />
      ) : null}
```

- [ ] **Step 3: Add CSS for destructive button**

Append to `src/styles.css`:

```css
.reset-row {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

.destructive-action {
  min-height: 2.5rem;
  padding: 0 1.2rem;
  border: 1px solid rgba(255, 138, 138, 0.55);
  border-radius: 0.8rem;
  color: #ff9c9c;
  background: transparent;
  font-weight: 700;
}

.destructive-action:hover {
  background: rgba(255, 111, 111, 0.08);
}
```

- [ ] **Step 4: Typecheck and run tests**

Run:
```
node ./node_modules/typescript/bin/tsc --noEmit && node ./node_modules/vitest/vitest.mjs run
```

Expected: typecheck passes; all tests still green.

- [ ] **Step 5: Commit**

```
git add src/screens/ProfileScreen.tsx src/App.tsx src/styles.css
git commit -m "feat: wire reset-prototype-data button on profile"
```

Expected: commit succeeds.

---

### Task 11: Final Verification

**Files:**
- Modify only if verification exposes a real bug.

- [ ] **Step 1: Run full verification**

Run each in sequence:

```
node ./node_modules/vitest/vitest.mjs run
node scripts/check-no-secrets.mjs
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/vite/bin/vite.js build
```

Expected: all four pass.

- [ ] **Step 2: Build for GitHub Pages**

Run (on Linux/macOS):
```
GITHUB_PAGES=true node ./node_modules/vite/bin/vite.js build
```

On Windows PowerShell:
```
$env:GITHUB_PAGES = 'true'; node ./node_modules/vite/bin/vite.js build; Remove-Item env:GITHUB_PAGES
```

Expected: build succeeds, `dist/index.html` references assets via `./assets/...` relative paths.

- [ ] **Step 3: Start dev server and smoke-test**

Run:
```
node ./node_modules/vite/bin/vite.js
```

Open `http://localhost:5173/`. At a mobile viewport (e.g. 390 × 844):

- Today: click "Apply easy version" → the Monday session changes to "Easier: CrossFit class" and intensity drops to low. Click "Restore" on that card → it reverts.
- Plan: click "Regenerate week" → variant pill cycles through `base → running → lifting → base`.
- Import: click Approve on the Wednesday workout → the toggle shows Approve as active. Click "Upload screenshot" → choose any image from the picker → a new "Uploaded: <filename>" card appears at the bottom.
- Log: pick a session, type a duration, click Save → "Saved" message appears for ~2s; the entry shows in Recent logs.
- Profile: scroll to the bottom; click "Reset prototype data" → confirm in the dialog → state resets, navigation lands back on Today.
- Reload the page mid-flow → state persists.

- [ ] **Step 4: Commit any verification fixes**

If changes were needed, run:

```
git add src
git commit -m "fix: polish interactive prototype after smoke test"
```

If no changes were needed, skip this step.

---

## Self-Review Notes

- **Spec coverage:** Every behavior section in the spec maps to a task. State shape → Task 1. Reducer → Task 2. Persistence → Task 3. App.tsx wiring → Task 4. Approve/Reject → Task 5. Apply easy + Restore → Task 6. Regenerate → Task 7. Upload → Task 8. Save log + Recent logs → Task 9. Reset → Task 10. Final smoke → Task 11.
- **Security coverage:** No new credential surfaces. The Upload button never reads file contents. The secret-scanner-friendly wording from CLAUDE.md remains in effect.
- **Scope control:** The plan adds no backend, no auth, no real OCR, no calendar/wearables/nutrition.
- **Testing coverage:** Helpers tested in `appState.test.ts`. Reducer tested action-by-action in `appState.test.ts`. Persistence tested in `appPersistence.test.ts`. Three new interaction tests in `app.test.tsx` for Approve, Apply-easy-and-Restore, and Save-log.
- **Type consistency:** `PlanVariantIndex`, `AppAction`, `AppState`, `ScreenKey` referenced consistently across tasks. `findNextHardPlannedSession` and `nextEmptyDay` defined in Task 1, used in Task 2 (reducer) and Task 6 (Today screen).
- **Placeholder scan:** No TBDs, TODOs, or "implement later" markers.
