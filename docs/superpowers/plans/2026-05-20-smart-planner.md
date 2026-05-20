# Smart Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3 hand-written `planTemplates` + `planVariantIndex` cycling with a tagged ~12-entry library and a rule-based picker that scores against logs, readiness, profile, and availability. Produce a human-readable rationale alongside each pick.

**Architecture:** Pure domain modules (`planLibrary.ts` + `planPicker.ts`) with extensive unit tests. AppState bumps schema to v2 (drops old logs/plan-variant); `REGENERATE_WEEK` becomes `PICK_NEW_PLAN { readiness, availability, goal }` whose payload is supplied by App.tsx at dispatch time so the reducer stays pure. `state.planTags` and `state.planRationale` replace `state.planVariantIndex`. `RESTORE_SESSION` looks up the canonical session by slug from the library.

**Tech Stack:** React 19, TypeScript (strict), Vite, Vitest, React Testing Library, jsdom, lucide-react. No new runtime dependencies.

**Source spec:** [`docs/superpowers/specs/2026-05-20-smart-planner-design.md`](../specs/2026-05-20-smart-planner-design.md)

---

## Working Directory & Run Convention

All commands run from the repo root. `npm` is the canonical entry point:

| Logical command | Concrete command |
|---|---|
| run all tests | `npm run test` |
| run a single test file | `npx vitest run path/to/file.test.ts` |
| run tests matching a name | `npx vitest run -t "test name"` |
| typecheck | `npx tsc --noEmit` |
| canonical verify | `npm run verify` |

User authorizes direct push to master after each task: `git push origin master`. If a push fails because the remote moved, `git fetch origin && git rebase origin/master && git push origin master`. Never force-push.

---

## File Structure

**New**
- `src/domain/planLibrary.ts` — `PlanEmphasis | PlanLoad | PlanVolume` types, `PlanTags` + `TaggedPlan` interfaces, `planLibrary` array, helper `findTaggedBySlug`.
- `src/domain/planLibrary.test.ts` — coverage tests (every emphasis covered, every load covered, recovery entry exists, minDailyMinutes ≤ max session duration in each plan, slugs unique).
- `src/domain/planPicker.ts` — `PickerInput`, `PickerResult`, `pickPlan`, internal rule functions, rationale templates.
- `src/domain/planPicker.test.ts` — rule-firing tests, scoring tests, rationale tests, determinism, exclude/availability filters, fallback.

**Modified**
- `src/domain/appState.ts` — bump `schemaVersion` to 2; replace `planVariantIndex` with `planTags: PlanTags` and `planRationale: string`; replace `REGENERATE_WEEK` with `PICK_NEW_PLAN { readiness, availability, goal }`; update `RESTORE_SESSION` to look up via `findTaggedBySlug(state.planTags.slug)`; update `initialAppState` to use `planLibrary[0]` (or named seed entry) and a starter rationale.
- `src/domain/appState.test.ts` — replace `REGENERATE_WEEK` tests with `PICK_NEW_PLAN` tests; update `RESTORE_SESSION` test to assert the new library-lookup path; update `initialAppState` shape test.
- `src/services/appPersistence.ts` — change the version check from `schemaVersion !== 1` to `schemaVersion !== 2` (drops v1 payloads cleanly per spec).
- `src/services/appPersistence.test.ts` — update existing tests to v2; add a regression test that a v1 payload is dropped to demo defaults.
- `src/App.tsx` — dispatch `PICK_NEW_PLAN` with payload `{ readiness: demoReadiness, availability: state.profile.weeklyAvailability, goal: state.profile.currentGoal }`; pass `state.planRationale` to `TodayScreen`; drop `state.planVariantIndex` consumer.
- `src/screens/PlanScreen.tsx` — replace `variantIndex` prop with `tags: PlanTags`; replace variant pill with `Tags: {emphasis} · {load} · {volume}` summary; rename `onRegenerateWeek` to keep its name — the dispatch in `App.tsx` is what changes.
- `src/screens/TodayScreen.tsx` — accept `rationale: string` prop; render `<p className="rationale-line">Why this week: {rationale}</p>` directly below CoachCard.
- `src/__tests__/app.test.tsx` — update the Regenerate-week test to assert both plan and rationale update.
- `src/styles.css` — append `.rationale-line` and `.tag-summary` rules.

**Deleted**
- `src/domain/planTemplates.ts` — superseded by `planLibrary.ts`.

**Unchanged**
- `src/domain/types.ts`, `src/domain/planning.ts`, `src/services/localStore.ts`, `src/components/*`, `src/screens/{ImportScreen,LogScreen,ProfileScreen}.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts`, `package.json`.

---

### Task 1: Plan library types and starter entries

**Files:**
- Create: `src/domain/planLibrary.ts`
- Create: `src/domain/planLibrary.test.ts`

Introduces the tagged-plan domain types and seeds 6 starter entries — enough to satisfy the picker's coverage requirements in Task 2. Task 3 expands the library.

- [ ] **Step 1: Write coverage tests first**

Create `src/domain/planLibrary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findTaggedBySlug, planLibrary } from './planLibrary';
import type { PlanEmphasis, PlanLoad } from './planLibrary';

describe('planLibrary', () => {
  it('has at least 6 entries', () => {
    expect(planLibrary.length).toBeGreaterThanOrEqual(6);
  });

  it('has at least one entry for every emphasis', () => {
    const emphases: PlanEmphasis[] = ['running', 'lifting', 'balanced', 'recovery'];
    for (const emphasis of emphases) {
      const hits = planLibrary.filter((entry) => entry.tags.emphasis === emphasis);
      expect(hits.length, `missing emphasis: ${emphasis}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('has at least one entry for every load', () => {
    const loads: PlanLoad[] = ['easy', 'moderate', 'hard'];
    for (const load of loads) {
      const hits = planLibrary.filter((entry) => entry.tags.load === load);
      expect(hits.length, `missing load: ${load}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('has unique slugs', () => {
    const slugs = planLibrary.map((entry) => entry.tags.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('keeps each entry minDailyMinutes ≤ its longest session duration', () => {
    for (const entry of planLibrary) {
      const longest = Math.max(...entry.plan.sessions.map((session) => session.durationMinutes));
      expect(
        entry.tags.minDailyMinutes,
        `${entry.tags.slug}: minDailyMinutes ${entry.tags.minDailyMinutes} > longest session ${longest}`
      ).toBeLessThanOrEqual(longest);
    }
  });

  it('every plan has at least 3 sessions', () => {
    for (const entry of planLibrary) {
      expect(entry.plan.sessions.length, `${entry.tags.slug}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('findTaggedBySlug returns the matching entry or undefined', () => {
    const first = planLibrary[0];
    expect(findTaggedBySlug(first.tags.slug)).toBe(first);
    expect(findTaggedBySlug('no-such-slug')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npx vitest run src/domain/planLibrary.test.ts
```

Expected: FAIL because `planLibrary.ts` does not exist.

- [ ] **Step 3: Create `src/domain/planLibrary.ts` with types and 6 starter entries**

Create `src/domain/planLibrary.ts`:

```ts
import type { WeeklyPlan } from './types';

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

const balancedModerate: TaggedPlan = {
  tags: { emphasis: 'balanced', load: 'moderate', volume: 'moderate', minDailyMinutes: 30, slug: 'balanced-moderate' },
  plan: {
    weekLabel: 'Balanced week',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Heavy strength + short metcon', durationMinutes: 60, intensity: 'high', status: 'planned', warning: 'Avoid hard running after this lower-body load.' },
      { id: 'tue-run', day: 'Tue', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Recover legs, build aerobic base', durationMinutes: 40, intensity: 'low', status: 'planned' },
      { id: 'wed-cf', day: 'Wed', type: 'crossfit', title: 'CrossFit class', purpose: 'Gymnastics + engine', durationMinutes: 55, intensity: 'moderate', status: 'planned' },
      { id: 'thu-quality', day: 'Thu', type: 'quality-run', title: 'Tempo intervals', purpose: 'Improve running speed with capped fatigue', durationMinutes: 45, intensity: 'moderate', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Extend aerobic base', durationMinutes: 70, intensity: 'low', status: 'planned' }
    ]
  }
};

const runningHard: TaggedPlan = {
  tags: { emphasis: 'running', load: 'hard', volume: 'high', minDailyMinutes: 35, slug: 'running-hard-high' },
  plan: {
    weekLabel: 'Running focus — hard',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Quality lifting only, lighter metcon', durationMinutes: 45, intensity: 'moderate', status: 'planned' },
      { id: 'tue-run', day: 'Tue', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Build durability without adding intensity', durationMinutes: 45, intensity: 'low', status: 'planned' },
      { id: 'wed-run', day: 'Wed', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Extra aerobic volume', durationMinutes: 40, intensity: 'low', status: 'planned' },
      { id: 'thu-quality', day: 'Thu', type: 'quality-run', title: 'Hard intervals', purpose: '6 × 800m at threshold pace', durationMinutes: 55, intensity: 'high', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long progression run', purpose: 'Last 20 min at moderate effort', durationMinutes: 90, intensity: 'moderate', status: 'planned' }
    ]
  }
};

const runningEasy: TaggedPlan = {
  tags: { emphasis: 'running', load: 'easy', volume: 'moderate', minDailyMinutes: 25, slug: 'running-easy-moderate' },
  plan: {
    weekLabel: 'Running focus — easy week',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class (light)', purpose: 'Skill work, no heavy lower body', durationMinutes: 40, intensity: 'low', status: 'planned' },
      { id: 'tue-run', day: 'Tue', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Conversational pace, nothing more', durationMinutes: 35, intensity: 'low', status: 'planned' },
      { id: 'thu-run', day: 'Thu', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Build durability gently', durationMinutes: 30, intensity: 'low', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Time on feet, no pace targets', durationMinutes: 55, intensity: 'low', status: 'planned' }
    ]
  }
};

const liftingHard: TaggedPlan = {
  tags: { emphasis: 'lifting', load: 'hard', volume: 'high', minDailyMinutes: 45, slug: 'lifting-hard-high' },
  plan: {
    weekLabel: 'Lifting focus — heavy',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Heavy strength + metcon', durationMinutes: 70, intensity: 'high', status: 'planned', warning: 'Avoid hard running after this lower-body load.' },
      { id: 'tue-cf', day: 'Tue', type: 'crossfit', title: 'CrossFit class', purpose: 'Gymnastics skill day', durationMinutes: 60, intensity: 'moderate', status: 'planned' },
      { id: 'wed-run', day: 'Wed', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Recover legs between lifts', durationMinutes: 30, intensity: 'low', status: 'planned' },
      { id: 'thu-cf', day: 'Thu', type: 'crossfit', title: 'CrossFit class', purpose: 'Engine work', durationMinutes: 65, intensity: 'high', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Maintain aerobic base', durationMinutes: 45, intensity: 'low', status: 'planned' }
    ]
  }
};

const recoveryEasy: TaggedPlan = {
  tags: { emphasis: 'recovery', load: 'easy', volume: 'low', minDailyMinutes: 20, slug: 'recovery-easy-low' },
  plan: {
    weekLabel: 'Recovery week',
    sessions: [
      { id: 'mon-recovery', day: 'Mon', type: 'recovery', title: 'Mobility + walk', purpose: 'Move easy, no intensity', durationMinutes: 30, intensity: 'low', status: 'planned' },
      { id: 'wed-run', day: 'Wed', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Short, very conversational', durationMinutes: 25, intensity: 'low', status: 'planned' },
      { id: 'fri-cf', day: 'Fri', type: 'crossfit', title: 'CrossFit class (deload)', purpose: 'Light technique work only', durationMinutes: 45, intensity: 'low', status: 'planned' },
      { id: 'sat-recovery', day: 'Sat', type: 'recovery', title: 'Long walk', purpose: 'Easy active recovery', durationMinutes: 40, intensity: 'low', status: 'planned' }
    ]
  }
};

const balancedHard: TaggedPlan = {
  tags: { emphasis: 'balanced', load: 'hard', volume: 'high', minDailyMinutes: 45, slug: 'balanced-hard-high' },
  plan: {
    weekLabel: 'Balanced week — high effort',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Heavy strength block', durationMinutes: 70, intensity: 'high', status: 'planned', warning: 'Avoid hard running after this lower-body load.' },
      { id: 'tue-quality', day: 'Tue', type: 'quality-run', title: 'Threshold intervals', purpose: 'Aerobic ceiling work', durationMinutes: 55, intensity: 'high', status: 'planned' },
      { id: 'wed-cf', day: 'Wed', type: 'crossfit', title: 'CrossFit class', purpose: 'Mixed modal engine', durationMinutes: 60, intensity: 'moderate', status: 'planned' },
      { id: 'thu-run', day: 'Thu', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Active recovery between hard days', durationMinutes: 40, intensity: 'low', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long progression run', purpose: 'Aerobic volume with finish pace', durationMinutes: 80, intensity: 'moderate', status: 'planned' }
    ]
  }
};

export const planLibrary: readonly TaggedPlan[] = [
  balancedModerate,
  runningHard,
  runningEasy,
  liftingHard,
  recoveryEasy,
  balancedHard
] as const;

export function findTaggedBySlug(slug: string): TaggedPlan | undefined {
  return planLibrary.find((entry) => entry.tags.slug === slug);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npx vitest run src/domain/planLibrary.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```
git add src/domain/planLibrary.ts src/domain/planLibrary.test.ts
git commit -m "feat: add plan library types and 6 starter tagged plans"
git push origin master
```

Expected: commit and push succeed.

---

### Task 2: Picker logic with scoring and rationale

**Files:**
- Create: `src/domain/planPicker.ts`
- Create: `src/domain/planPicker.test.ts`

Implements the rule-based picker. Pure function with no side effects. Tests drive every scoring rule and every rationale template.

- [ ] **Step 1: Write failing picker tests**

Create `src/domain/planPicker.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickPlan } from './planPicker';
import type { TrainingLog, ReadinessCheckIn, AvailabilityWindow } from './types';

const defaultAvailability: AvailabilityWindow[] = [
  { day: 'Mon', available: true, minutes: 60 },
  { day: 'Tue', available: true, minutes: 60 },
  { day: 'Wed', available: true, minutes: 60 },
  { day: 'Thu', available: true, minutes: 60 },
  { day: 'Fri', available: true, minutes: 60 },
  { day: 'Sat', available: true, minutes: 90 },
  { day: 'Sun', available: false, minutes: 0 }
];

const okReadiness: ReadinessCheckIn = {
  soreness: 7,
  energy: 7,
  sleepQuality: 7,
  mood: 7,
  painFlag: false
};

const painReadiness: ReadinessCheckIn = { ...okReadiness, painFlag: true };

function logWithRpe(rpe: number, sessionId = 'mon-cf', completion: TrainingLog['completion'] = 'completed'): TrainingLog {
  return { sessionId, completion, rpe, durationMinutes: 60, notes: '' };
}

describe('pickPlan', () => {
  it('new user with empty logs and balanced goal returns a balanced or moderate plan', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'Stay healthy and consistent'
    });
    expect(['balanced', 'recovery']).toContain(result.tagged.tags.emphasis);
    expect(result.tagged.tags.load).not.toBe('hard');
    expect(result.firedRules).toContain('no-signal-default');
  });

  it('pain flag forces recovery or easy plan regardless of other signals', () => {
    const result = pickPlan({
      logs: [logWithRpe(5), logWithRpe(5), logWithRpe(5)],
      readiness: painReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(['recovery', 'easy']).toContain(
      result.tagged.tags.emphasis === 'recovery' ? 'recovery' : result.tagged.tags.load
    );
    expect(result.firedRules).toContain('pain-flagged');
    expect(result.rationale.toLowerCase()).toContain('pain');
  });

  it('high recent RPE pushes load easy even with a running goal', () => {
    const logs = [logWithRpe(8), logWithRpe(8), logWithRpe(8), logWithRpe(8), logWithRpe(8)];
    const result = pickPlan({
      logs,
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(result.tagged.tags.load).toBe('easy');
    expect(result.firedRules).toContain('high-fatigue-recent');
  });

  it('skipped sessions in last week pushes volume low', () => {
    const logs: TrainingLog[] = [
      { sessionId: 'a', completion: 'skipped', rpe: 0, durationMinutes: 0, notes: '' },
      { sessionId: 'b', completion: 'skipped', rpe: 0, durationMinutes: 0, notes: '' }
    ];
    const result = pickPlan({
      logs,
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(result.tagged.tags.volume).toBe('low');
    expect(result.firedRules).toContain('skipped-sessions');
  });

  it('low readiness score pushes load easy', () => {
    const result = pickPlan({
      logs: [],
      readiness: { soreness: 3, energy: 3, sleepQuality: 3, mood: 4, painFlag: false },
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(result.tagged.tags.load).toBe('easy');
    expect(result.firedRules).toContain('low-readiness');
  });

  it('goal mentions running → running emphasis', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'sub-20 5K'
    });
    expect(result.tagged.tags.emphasis).toBe('running');
    expect(result.firedRules).toContain('goal-running');
    expect(result.rationale.toLowerCase()).toContain('running');
  });

  it('goal mentions lifting/strength → lifting emphasis', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve back squat PR'
    });
    expect(result.tagged.tags.emphasis).toBe('lifting');
    expect(result.firedRules).toContain('goal-lifting');
  });

  it('goal mentions both → balanced emphasis', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'Improve running while keeping CrossFit performance sharp'
    });
    expect(result.tagged.tags.emphasis).toBe('balanced');
    expect(result.firedRules).toContain('goal-balanced');
  });

  it('tight availability filters out high-minDailyMinutes entries', () => {
    const tight: AvailabilityWindow[] = defaultAvailability.map((w) => ({ ...w, minutes: 25 }));
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: tight,
      goal: 'improve back squat PR'
    });
    expect(result.tagged.tags.minDailyMinutes).toBeLessThanOrEqual(30);
  });

  it('excludeSlugs skips the top scorer', () => {
    const base = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'sub-20 5K'
    });
    const next = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'sub-20 5K',
      excludeSlugs: [base.tagged.tags.slug]
    });
    expect(next.tagged.tags.slug).not.toBe(base.tagged.tags.slug);
  });

  it('is deterministic — identical input produces identical output', () => {
    const input = {
      logs: [logWithRpe(6), logWithRpe(7)],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    };
    const a = pickPlan(input);
    const b = pickPlan(input);
    expect(a.tagged.tags.slug).toBe(b.tagged.tags.slug);
    expect(a.rationale).toBe(b.rationale);
    expect(a.score).toBe(b.score);
    expect(a.firedRules).toEqual(b.firedRules);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npx vitest run src/domain/planPicker.test.ts
```

Expected: FAIL — `planPicker.ts` does not exist.

- [ ] **Step 3: Implement the picker**

Create `src/domain/planPicker.ts`:

```ts
import { planLibrary, type PlanEmphasis, type PlanLoad, type PlanVolume, type TaggedPlan } from './planLibrary';
import type { AvailabilityWindow, ReadinessCheckIn, TrainingLog } from './types';

export interface PickerInput {
  logs: TrainingLog[];
  readiness: ReadinessCheckIn;
  availability: AvailabilityWindow[];
  goal: string;
  excludeSlugs?: readonly string[];
}

export interface PickerResult {
  tagged: TaggedPlan;
  rationale: string;
  firedRules: readonly string[];
  score: number;
}

type EmphasisWeights = Record<PlanEmphasis, number>;
type LoadWeights = Record<PlanLoad, number>;
type VolumeWeights = Record<PlanVolume, number>;

interface RuleOutput {
  name: string;
  emphasis?: Partial<EmphasisWeights>;
  load?: Partial<LoadWeights>;
  volume?: Partial<VolumeWeights>;
  rationale?: string;
  rationalePriority: number;
}

const RUNNING_KEYWORDS = /run|running|5k|10k|marathon|pace|mile|km/i;
const LIFTING_KEYWORDS = /strength|lift|crossfit|pr|squat|deadlift|snatch|clean|jerk/i;

function readinessScore(r: ReadinessCheckIn): number {
  return Math.round((r.soreness + r.energy + r.sleepQuality + r.mood) * 2.5);
}

function recentLogs(logs: TrainingLog[], n: number): TrainingLog[] {
  return logs.slice(-n);
}

function averageRpe(logs: TrainingLog[]): number {
  const completed = logs.filter((log) => log.completion === 'completed' && log.rpe > 0);
  if (completed.length === 0) return 0;
  return completed.reduce((acc, log) => acc + log.rpe, 0) / completed.length;
}

function evaluateRules(input: PickerInput): RuleOutput[] {
  const fired: RuleOutput[] = [];

  if (input.readiness.painFlag) {
    fired.push({
      name: 'pain-flagged',
      emphasis: { recovery: 5 },
      load: { easy: 3 },
      rationale: 'Lighter week — you flagged pain on your check-in, so this plan keeps intensity low across the board.',
      rationalePriority: 100
    });
  }

  const recent = recentLogs(input.logs, 5);
  const avgRpe = averageRpe(recent);
  if (avgRpe >= 7.5) {
    fired.push({
      name: 'high-fatigue-recent',
      load: { easy: 3 },
      volume: { low: 2 },
      rationale: `Easier load — your last ${recent.length} sessions averaged RPE ${avgRpe.toFixed(1)}, which is a strong cue to back off.`,
      rationalePriority: 80
    });
  }

  const last7 = input.logs.slice(-7);
  const skippedCount = last7.filter((log) => log.completion === 'skipped').length;
  if (skippedCount >= 2) {
    fired.push({
      name: 'skipped-sessions',
      volume: { low: 2 },
      load: { easy: 2 },
      rationale: `Smaller week — you skipped ${skippedCount} sessions recently. This plan gives you space to actually finish each one.`,
      rationalePriority: 70
    });
  }

  if (readinessScore(input.readiness) < 60) {
    fired.push({
      name: 'low-readiness',
      load: { easy: 2 },
      rationale: 'Easier load — your readiness check-in is below par this week.',
      rationalePriority: 60
    });
  }

  const runMatch = RUNNING_KEYWORDS.test(input.goal);
  const liftMatch = LIFTING_KEYWORDS.test(input.goal);

  if (runMatch && liftMatch) {
    fired.push({
      name: 'goal-balanced',
      emphasis: { balanced: 4 },
      rationale: 'Balanced hybrid week — your goal blends running and strength, so this week mixes both without sacrificing either.',
      rationalePriority: 40
    });
  } else if (runMatch) {
    const keyword = input.goal.match(RUNNING_KEYWORDS)?.[0] ?? 'running';
    fired.push({
      name: 'goal-running',
      emphasis: { running: 4 },
      rationale: `Running emphasis — your goal mentions "${keyword}", so this week leans into aerobic work.`,
      rationalePriority: 40
    });
  } else if (liftMatch) {
    const keyword = input.goal.match(LIFTING_KEYWORDS)?.[0] ?? 'strength';
    fired.push({
      name: 'goal-lifting',
      emphasis: { lifting: 4 },
      rationale: `Strength emphasis — your goal centers on "${keyword}", so this week protects CrossFit volume.`,
      rationalePriority: 40
    });
  }

  const totalMinutes = input.availability
    .filter((window) => window.available)
    .reduce((acc, window) => acc + window.minutes, 0);

  if (totalMinutes < 200) {
    fired.push({
      name: 'tight-availability',
      volume: { low: 2 },
      rationale: 'Lighter week — your availability is tight, so this plan keeps sessions short and focused.',
      rationalePriority: 30
    });
  } else if (totalMinutes > 350 && avgRpe > 0 && avgRpe < 7) {
    fired.push({
      name: 'spacious-availability',
      volume: { high: 1 },
      rationalePriority: 10
    });
  }

  if (fired.length === 0 || (fired.length === 1 && fired[0].name === 'spacious-availability')) {
    fired.push({
      name: 'no-signal-default',
      emphasis: { balanced: 2 },
      load: { moderate: 2 },
      volume: { moderate: 2 },
      rationale: 'Balanced hybrid week — readiness is fine and your last week looked sustainable.',
      rationalePriority: 5
    });
  }

  return fired;
}

function accumulateWeights(rules: RuleOutput[]): {
  emphasis: EmphasisWeights;
  load: LoadWeights;
  volume: VolumeWeights;
} {
  const emphasis: EmphasisWeights = { running: 0, lifting: 0, balanced: 0, recovery: 0 };
  const load: LoadWeights = { easy: 0, moderate: 0, hard: 0 };
  const volume: VolumeWeights = { low: 0, moderate: 0, high: 0 };

  for (const rule of rules) {
    if (rule.emphasis) {
      for (const [key, value] of Object.entries(rule.emphasis) as [PlanEmphasis, number][]) {
        emphasis[key] += value;
      }
    }
    if (rule.load) {
      for (const [key, value] of Object.entries(rule.load) as [PlanLoad, number][]) {
        load[key] += value;
      }
    }
    if (rule.volume) {
      for (const [key, value] of Object.entries(rule.volume) as [PlanVolume, number][]) {
        volume[key] += value;
      }
    }
  }

  return { emphasis, load, volume };
}

function scorePlan(
  tagged: TaggedPlan,
  weights: { emphasis: EmphasisWeights; load: LoadWeights; volume: VolumeWeights }
): number {
  return (
    weights.emphasis[tagged.tags.emphasis] +
    weights.load[tagged.tags.load] +
    weights.volume[tagged.tags.volume]
  );
}

function minAvailableMinutes(availability: AvailabilityWindow[]): number {
  const available = availability.filter((window) => window.available);
  if (available.length === 0) return 0;
  return Math.min(...available.map((window) => window.minutes));
}

function pickRationale(rules: RuleOutput[]): string {
  const withText = rules.filter((rule) => rule.rationale);
  if (withText.length === 0) return 'Balanced hybrid week — readiness is fine and your last week looked sustainable.';
  return [...withText].sort((a, b) => b.rationalePriority - a.rationalePriority)[0].rationale!;
}

export function pickPlan(input: PickerInput): PickerResult {
  if (planLibrary.length === 0) {
    throw new Error('planLibrary is empty');
  }

  const rules = evaluateRules(input);
  const weights = accumulateWeights(rules);
  const minMinutes = minAvailableMinutes(input.availability);
  const exclude = new Set(input.excludeSlugs ?? []);

  const candidates = planLibrary
    .filter((entry) => !exclude.has(entry.tags.slug))
    .filter((entry) => entry.tags.minDailyMinutes <= minMinutes || minMinutes === 0);

  const pool = candidates.length > 0 ? candidates : [...planLibrary].sort((a, b) => a.tags.minDailyMinutes - b.tags.minDailyMinutes).slice(0, 1);

  const scored = pool
    .map((entry) => ({ entry, score: scorePlan(entry, weights) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.tags.slug.localeCompare(b.entry.tags.slug);
    });

  const top = scored[0];
  const rationale = candidates.length === 0
    ? 'Lighter week — your availability is tight, so this plan keeps sessions short and focused.'
    : pickRationale(rules);

  return {
    tagged: top.entry,
    rationale,
    firedRules: rules.map((rule) => rule.name),
    score: top.score
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npx vitest run src/domain/planPicker.test.ts
```

Expected: all 11 tests pass.

If any test fails because the library doesn't have an appropriate entry (e.g. no `running-easy-moderate` exists), STOP — extend the library in Task 1 first rather than relaxing the test. (Task 1's 6 starter entries are calibrated for these tests.)

- [ ] **Step 5: Commit**

```
git add src/domain/planPicker.ts src/domain/planPicker.test.ts
git commit -m "feat: add rule-based plan picker with rationale generation"
git push origin master
```

Expected: commit and push succeed.

---

### Task 3: Expand library to 12 entries for fuller coverage

**Files:**
- Modify: `src/domain/planLibrary.ts`

Adds 6 more `TaggedPlan` entries so the picker has finer-grained options across the matrix. Keeps the coverage tests green and the picker tests deterministic.

- [ ] **Step 1: Append 6 new entries to `src/domain/planLibrary.ts`**

Insert these constants ABOVE the existing `export const planLibrary = ...` line, in declaration order. Then update the `planLibrary` array to include them.

```ts
const runningModerate: TaggedPlan = {
  tags: { emphasis: 'running', load: 'moderate', volume: 'moderate', minDailyMinutes: 30, slug: 'running-moderate-moderate' },
  plan: {
    weekLabel: 'Running focus — moderate',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Light strength, no metcon spike', durationMinutes: 50, intensity: 'moderate', status: 'planned' },
      { id: 'tue-run', day: 'Tue', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Conversational pace', durationMinutes: 40, intensity: 'low', status: 'planned' },
      { id: 'wed-run', day: 'Wed', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Aerobic volume', durationMinutes: 35, intensity: 'low', status: 'planned' },
      { id: 'thu-quality', day: 'Thu', type: 'quality-run', title: 'Tempo intervals', purpose: 'Controlled threshold work', durationMinutes: 50, intensity: 'moderate', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Time on feet', durationMinutes: 75, intensity: 'low', status: 'planned' }
    ]
  }
};

const liftingModerate: TaggedPlan = {
  tags: { emphasis: 'lifting', load: 'moderate', volume: 'moderate', minDailyMinutes: 40, slug: 'lifting-moderate-moderate' },
  plan: {
    weekLabel: 'Lifting focus — moderate',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Squat focus + short metcon', durationMinutes: 65, intensity: 'moderate', status: 'planned' },
      { id: 'tue-cf', day: 'Tue', type: 'crossfit', title: 'CrossFit class', purpose: 'Pulling focus', durationMinutes: 55, intensity: 'moderate', status: 'planned' },
      { id: 'wed-run', day: 'Wed', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Active recovery', durationMinutes: 30, intensity: 'low', status: 'planned' },
      { id: 'thu-cf', day: 'Thu', type: 'crossfit', title: 'CrossFit class', purpose: 'Engine + Olympic lifting', durationMinutes: 60, intensity: 'moderate', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Maintain aerobic base', durationMinutes: 50, intensity: 'low', status: 'planned' }
    ]
  }
};

const liftingEasy: TaggedPlan = {
  tags: { emphasis: 'lifting', load: 'easy', volume: 'low', minDailyMinutes: 30, slug: 'lifting-easy-low' },
  plan: {
    weekLabel: 'Lifting focus — deload',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class (light)', purpose: 'Technique work, no PR attempts', durationMinutes: 50, intensity: 'low', status: 'planned' },
      { id: 'wed-cf', day: 'Wed', type: 'crossfit', title: 'CrossFit class (light)', purpose: 'Gymnastics skill', durationMinutes: 45, intensity: 'low', status: 'planned' },
      { id: 'fri-cf', day: 'Fri', type: 'crossfit', title: 'CrossFit class (light)', purpose: 'Light metcon, no heavy loading', durationMinutes: 45, intensity: 'low', status: 'planned' },
      { id: 'sat-run', day: 'Sat', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Optional, easy pace', durationMinutes: 35, intensity: 'low', status: 'planned' }
    ]
  }
};

const balancedEasy: TaggedPlan = {
  tags: { emphasis: 'balanced', load: 'easy', volume: 'low', minDailyMinutes: 25, slug: 'balanced-easy-low' },
  plan: {
    weekLabel: 'Balanced week — easy',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class (light)', purpose: 'Light strength, no metcon spike', durationMinutes: 45, intensity: 'low', status: 'planned' },
      { id: 'tue-run', day: 'Tue', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Conversational', durationMinutes: 30, intensity: 'low', status: 'planned' },
      { id: 'thu-cf', day: 'Thu', type: 'crossfit', title: 'CrossFit class (light)', purpose: 'Light gymnastics', durationMinutes: 40, intensity: 'low', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Short, very easy', durationMinutes: 45, intensity: 'low', status: 'planned' }
    ]
  }
};

const balancedLowVolume: TaggedPlan = {
  tags: { emphasis: 'balanced', load: 'moderate', volume: 'low', minDailyMinutes: 25, slug: 'balanced-moderate-low' },
  plan: {
    weekLabel: 'Balanced week — minimal',
    sessions: [
      { id: 'mon-cf', day: 'Mon', type: 'crossfit', title: 'CrossFit class', purpose: 'Strength + short metcon', durationMinutes: 55, intensity: 'moderate', status: 'planned' },
      { id: 'wed-run', day: 'Wed', type: 'easy-run', title: 'Easy aerobic run', purpose: 'Aerobic touch-up', durationMinutes: 35, intensity: 'low', status: 'planned' },
      { id: 'sat-long', day: 'Sat', type: 'long-run', title: 'Long easy run', purpose: 'Aerobic volume', durationMinutes: 60, intensity: 'low', status: 'planned' }
    ]
  }
};

const recoveryRecovery: TaggedPlan = {
  tags: { emphasis: 'recovery', load: 'easy', volume: 'low', minDailyMinutes: 20, slug: 'recovery-mobility-low' },
  plan: {
    weekLabel: 'Recovery week — mobility focus',
    sessions: [
      { id: 'mon-recovery', day: 'Mon', type: 'recovery', title: 'Mobility flow', purpose: 'Hip + ankle mobility', durationMinutes: 25, intensity: 'low', status: 'planned' },
      { id: 'wed-recovery', day: 'Wed', type: 'recovery', title: 'Walk + breath work', purpose: 'Parasympathetic reset', durationMinutes: 35, intensity: 'low', status: 'planned' },
      { id: 'fri-recovery', day: 'Fri', type: 'recovery', title: 'Yoga + foam roll', purpose: 'Soft tissue + range', durationMinutes: 40, intensity: 'low', status: 'planned' }
    ]
  }
};
```

Then update the export:

```ts
export const planLibrary: readonly TaggedPlan[] = [
  balancedModerate,
  balancedHard,
  balancedEasy,
  balancedLowVolume,
  runningHard,
  runningModerate,
  runningEasy,
  liftingHard,
  liftingModerate,
  liftingEasy,
  recoveryEasy,
  recoveryRecovery
] as const;
```

- [ ] **Step 2: Update the coverage test count assertion**

Modify `src/domain/planLibrary.test.ts`. Change the first assertion to:

```ts
  it('has at least 12 entries', () => {
    expect(planLibrary.length).toBeGreaterThanOrEqual(12);
  });
```

- [ ] **Step 3: Run all tests**

Run:
```
npm run test
```

Expected: all tests still pass. Picker tests remain deterministic — note that the deterministic test pins the exact slug, so if the new entries change the top scorer for that input, the test will fail.

If the deterministic test fails after adding entries (because a new entry now outscores the old top pick for the `improve running` + RPE-6/7 input), update the test to compare against the new winner. **Do not loosen the determinism assertion** — keep it asserting equal slugs, just update the expected slug. Re-run; it must be stable across two runs.

Actually the test as written never names a specific slug (it just asserts `a === b`), so re-running should pass without changes. Confirm both runs match.

- [ ] **Step 4: Commit**

```
git add src/domain/planLibrary.ts src/domain/planLibrary.test.ts
git commit -m "feat: expand plan library to 12 tagged entries for picker coverage"
git push origin master
```

Expected: commit and push succeed.

---

### Task 4: AppState schema bump and PICK_NEW_PLAN action

**Files:**
- Modify: `src/domain/appState.ts`
- Modify: `src/domain/appState.test.ts`
- Modify: `src/services/appPersistence.ts`
- Modify: `src/services/appPersistence.test.ts`
- Delete: `src/domain/planTemplates.ts`

Schema bumps from 1 to 2. Drops `planVariantIndex`; adds `planTags` and `planRationale`. Replaces `REGENERATE_WEEK` with `PICK_NEW_PLAN { readiness, availability, goal }`. Updates `RESTORE_SESSION` to look up the canonical plan via the library slug.

- [ ] **Step 1: Update `src/domain/appState.ts`**

Replace the imports block:

```ts
import { demoImportedWorkouts, demoProfile } from './demoData';
import { dayOrder } from './planning';
import { findTaggedBySlug, planLibrary, type PlanTags } from './planLibrary';
import { pickPlan } from './planPicker';
import type {
  AthleteProfile,
  AvailabilityWindow,
  ImportedWorkout,
  PlannedSession,
  ReadinessCheckIn,
  ReviewState,
  TrainingLog,
  WeeklyPlan
} from './types';
```

Replace the `AppState` interface — remove `planVariantIndex`, add `planTags` and `planRationale`, bump `schemaVersion`:

```ts
export interface AppState {
  activeScreen: ScreenKey;
  workouts: ImportedWorkout[];
  plan: WeeklyPlan;
  logs: TrainingLog[];
  schemaVersion: 2;
  profile: AthleteProfile;
  hasCustomizedProfile: boolean;
  hasDismissedProfilePrompt: boolean;
  planTags: PlanTags;
  planRationale: string;
}
```

Pick a starter tagged plan deterministically (the first balanced-moderate entry):

```ts
const starter = findTaggedBySlug('balanced-moderate') ?? planLibrary[0];
```

Place this constant just above `initialAppState`. Then update `initialAppState`:

```ts
export const initialAppState: AppState = {
  activeScreen: 'today',
  workouts: demoImportedWorkouts,
  plan: starter.plan,
  logs: [],
  schemaVersion: 2,
  profile: demoProfile,
  hasCustomizedProfile: false,
  hasDismissedProfilePrompt: false,
  planTags: starter.tags,
  planRationale: 'Balanced hybrid week — a sensible starting point.'
};
```

Replace `REGENERATE_WEEK` in the `AppAction` union with the new action. The full updated union:

```ts
export type AppAction =
  | { type: 'SET_ACTIVE_SCREEN'; screen: ScreenKey }
  | { type: 'APPROVE_WORKOUT'; id: string }
  | { type: 'REJECT_WORKOUT'; id: string }
  | { type: 'APPLY_EASY_VERSION'; flavor: 'easier' | 'recovery' }
  | { type: 'RESTORE_SESSION'; sessionId: string }
  | { type: 'PICK_NEW_PLAN'; readiness: ReadinessCheckIn; availability: AvailabilityWindow[]; goal: string }
  | { type: 'ADD_UPLOADED_WORKOUT'; fileName: string }
  | { type: 'SAVE_LOG'; log: TrainingLog }
  | { type: 'UPDATE_PROFILE'; profile: AthleteProfile }
  | { type: 'DISMISS_PROFILE_PROMPT' }
  | { type: 'RESET_TO_DEMO' };
```

Replace the `RESTORE_SESSION` case so it looks up via the library slug:

```ts
    case 'RESTORE_SESSION': {
      const template = findTaggedBySlug(state.planTags.slug);
      if (!template) return state;
      const originalSession = template.plan.sessions.find((s) => s.id === action.sessionId);
      if (!originalSession) return state;
      const sessions = state.plan.sessions.map((session) =>
        session.id === action.sessionId ? { ...originalSession } : session
      );
      return { ...state, plan: { ...state.plan, sessions } };
    }
```

Replace the `REGENERATE_WEEK` case with `PICK_NEW_PLAN`:

```ts
    case 'PICK_NEW_PLAN': {
      const result = pickPlan({
        logs: state.logs,
        readiness: action.readiness,
        availability: action.availability,
        goal: action.goal,
        excludeSlugs: [state.planTags.slug]
      });
      return {
        ...state,
        plan: result.tagged.plan,
        planTags: result.tagged.tags,
        planRationale: result.rationale
      };
    }
```

- [ ] **Step 2: Update `src/domain/appState.test.ts`**

Replace any tests that reference `REGENERATE_WEEK` or `planVariantIndex` with these:

```ts
import { findTaggedBySlug } from './planLibrary';

describe('PICK_NEW_PLAN', () => {
  const action = {
    type: 'PICK_NEW_PLAN' as const,
    readiness: { soreness: 7, energy: 7, sleepQuality: 7, mood: 7, painFlag: false },
    availability: initialAppState.profile.weeklyAvailability,
    goal: initialAppState.profile.currentGoal
  };

  it('replaces plan, planTags, and planRationale based on the picker result', () => {
    const next = appReducer(initialAppState, action);
    expect(next.planTags.slug).not.toBe(initialAppState.planTags.slug);
    expect(next.plan).toBe(findTaggedBySlug(next.planTags.slug)?.plan);
    expect(next.planRationale.length).toBeGreaterThan(0);
  });

  it('excludes the current plan from re-selection', () => {
    const next = appReducer(initialAppState, action);
    const again = appReducer(next, action);
    expect(again.planTags.slug).not.toBe(next.planTags.slug);
  });
});
```

Update the `initialAppState` shape tests — drop any `planVariantIndex` assertion, add:

```ts
  it('seeds planTags and planRationale from the starter library entry', () => {
    expect(initialAppState.planTags.slug).toBe('balanced-moderate');
    expect(initialAppState.planRationale).toMatch(/balanced hybrid week/i);
    expect(initialAppState.schemaVersion).toBe(2);
  });
```

Update existing `RESTORE_SESSION` tests if any of them relied on the old `planVariantIndex`. The test from interactive-features (Task 6) used `initialAppState.plan.sessions.find((s) => s.id === 'mon-cf')` as the original — since the new starter (`balanced-moderate`) still has `mon-cf` in its sessions, this should keep working. If it doesn't, update the asserted session id to one that exists in the starter plan.

- [ ] **Step 3: Update `src/services/appPersistence.ts`**

Change the schemaVersion guard from `1` to `2`:

```ts
  if (candidate.schemaVersion !== 2) {
    return initialAppState;
  }
```

- [ ] **Step 4: Update `src/services/appPersistence.test.ts`**

Update existing tests that hardcode `schemaVersion: 1` in test fixtures — change them to `2`. Then add a regression test for v1 dropping cleanly:

```ts
  it('drops v1 payloads to demo defaults after the v2 schema bump', () => {
    const legacy = {
      activeScreen: 'plan',
      workouts: initialAppState.workouts,
      plan: initialAppState.plan,
      logs: [{ sessionId: 'mon-cf', completion: 'completed', rpe: 7, durationMinutes: 60, notes: '' }],
      planVariantIndex: 1,
      schemaVersion: 1
    };
    window.localStorage.setItem(STATE_KEY, JSON.stringify(legacy));
    expect(loadAppState()).toEqual(initialAppState);
  });
```

- [ ] **Step 5: Delete `src/domain/planTemplates.ts`**

The library replaces it. Run:

```
rm src/domain/planTemplates.ts
```

Then `grep -rn "planTemplates\|PlanVariantIndex" src/` should return zero matches. If it still finds references in any non-test file, those need to be cleaned up before this task can commit.

- [ ] **Step 6: Typecheck and run tests**

Run:
```
npx tsc --noEmit && npm run test
```

Expected: typecheck passes, all tests pass.

At this point, App.tsx will be broken (it still passes `variantIndex` to PlanScreen and dispatches `REGENERATE_WEEK`) — Task 5 fixes that. If `npm run test` fails because of App.tsx, the app-level test file is the one that breaks, NOT the domain tests. Confirm domain tests pass:

```
npx vitest run src/domain
```

If domain tests are green and the app test failures are limited to "old action types" issues that Task 5 will fix, **STOP here and proceed to Task 5 immediately** — don't commit a broken master push. Combine the commits if needed.

Actually — to keep master green at every push, this task's commit should NOT leave App.tsx broken. Skip the commit step in this task; let Task 5's commit cover both the state changes and the UI changes together.

- [ ] **Step 7: SKIP commit — combine with Task 5**

Leave the working tree dirty. Move directly to Task 5.

---

### Task 5: App.tsx + UI wiring (PlanScreen tag summary + Today rationale)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/PlanScreen.tsx`
- Modify: `src/screens/TodayScreen.tsx`
- Modify: `src/__tests__/app.test.tsx`
- Modify: `src/styles.css`

Wires the new `PICK_NEW_PLAN` action through App.tsx with the runtime payload. Updates PlanScreen header (variant pill → tag summary). Adds the "Why this week:" rationale line below the CoachCard on Today.

- [ ] **Step 1: Update `src/screens/PlanScreen.tsx`**

Replace the file with:

```tsx
import { SessionCard } from '../components/SessionCard';
import type { PlanTags } from '../domain/planLibrary';
import type { WeeklyPlan } from '../domain/types';

interface PlanScreenProps {
  plan: WeeklyPlan;
  tags: PlanTags;
  onRegenerateWeek: () => void;
  onRestore: (sessionId: string) => void;
}

export function PlanScreen({ plan, tags, onRegenerateWeek, onRestore }: PlanScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>{plan.weekLabel}</h1>
        </div>
        <div className="plan-header-actions">
          <span className="tag-summary">
            Tags: {tags.emphasis} · {tags.load} · {tags.volume}
          </span>
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

The old `variantLabels` import is gone.

- [ ] **Step 2: Update `src/screens/TodayScreen.tsx`**

Add a `rationale: string` prop and render `Why this week: {rationale}` immediately AFTER the `<CoachCard>` (so it sits below the recommendation body in the same column).

Update the props interface (keep all existing fields, add `rationale`):

```ts
interface TodayScreenProps {
  plan: WeeklyPlan;
  readiness: ReadinessCheckIn;
  recommendation: CoachRecommendation;
  rationale: string;
  onApplyEasyVersion: () => void;
  onRestore: (sessionId: string) => void;
  showProfilePrompt: boolean;
  onDismissProfilePrompt: () => void;
  onNavigateToProfile: () => void;
}
```

Update the destructuring and add the `rationale` consumer. Inside the existing column that contains `<CoachCard>` and `<SessionCard>`, insert a `<p>` between them:

```tsx
          <CoachCard
            recommendation={recommendation}
            onAction={onApplyEasyVersion}
            disabled={!canApplyEasy}
          />
          <p className="rationale-line"><strong>Why this week:</strong> {rationale}</p>
          <SessionCard session={nextSession} onRestore={onRestore} />
```

- [ ] **Step 3: Update `src/App.tsx`**

Replace the `TodayScreen` render block — add `rationale={state.planRationale}`:

```tsx
      {state.activeScreen === 'today' ? (
        <TodayScreen
          plan={protectedPlan}
          readiness={demoReadiness}
          recommendation={demoRecommendations[0]}
          rationale={state.planRationale}
          onApplyEasyVersion={() =>
            dispatch({
              type: 'APPLY_EASY_VERSION',
              flavor: demoRecommendations[0].id === 'pain-flag' ? 'recovery' : 'easier'
            })
          }
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
          showProfilePrompt={!state.hasCustomizedProfile && !state.hasDismissedProfilePrompt}
          onDismissProfilePrompt={() => dispatch({ type: 'DISMISS_PROFILE_PROMPT' })}
          onNavigateToProfile={() => dispatch({ type: 'SET_ACTIVE_SCREEN', screen: 'profile' })}
        />
      ) : null}
```

Replace the `PlanScreen` render block — switch `variantIndex` to `tags`, and update the dispatch:

```tsx
      {state.activeScreen === 'plan' ? (
        <PlanScreen
          plan={protectedPlan}
          tags={state.planTags}
          onRegenerateWeek={() =>
            dispatch({
              type: 'PICK_NEW_PLAN',
              readiness: demoReadiness,
              availability: state.profile.weeklyAvailability,
              goal: state.profile.currentGoal
            })
          }
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
        />
      ) : null}
```

- [ ] **Step 4: Update the existing Regenerate test in `src/__tests__/app.test.tsx`**

The existing `applies an easier version of the next hard session...` test stays. The interactive-features Task 7 plan added a test for variant cycling — there isn't one in the current `app.test.tsx` per the canonical interactive-features execution (no integration test was added for `REGENERATE_WEEK` specifically). If you find one, update it to assert that the rationale text changes after clicking Regenerate.

Add a new integration test inside `describe('App', ...)`:

```tsx
  it('regenerating the week updates the tag summary and rationale', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /^plan$/i })[0]);

    const initialTagText = screen.getByText(/tags: /i).textContent ?? '';
    const initialRationale = screen.getByText(/why this week/i).textContent ?? '';

    await user.click(screen.getByRole('button', { name: /regenerate week/i }));

    const updatedTagText = screen.getByText(/tags: /i).textContent ?? '';
    expect(updatedTagText).not.toBe(initialTagText);

    await user.click(screen.getAllByRole('button', { name: /today/i })[0]);
    const updatedRationale = screen.getByText(/why this week/i).textContent ?? '';
    expect(updatedRationale).not.toBe(initialRationale);
  });
```

- [ ] **Step 5: Append CSS**

Append to `src/styles.css`:

```css
.tag-summary {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #aab5c5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  text-transform: capitalize;
}

.rationale-line {
  margin: 0;
  padding: 0.65rem 0.85rem;
  border-left: 3px solid #7ee0b2;
  background: rgba(126, 224, 178, 0.06);
  color: #d5e1f3;
  font-size: 0.92rem;
}

.rationale-line strong {
  color: #ecf2ff;
}
```

Remove the old `.variant-pill` CSS rule block (kept from interactive-features Task 7) — search for `.variant-pill` and delete the rule. If it's not present, skip.

- [ ] **Step 6: Run full verify**

Run:
```
npm run verify
```

Expected: all tests pass, secret scan passes, build succeeds.

If the existing "navigates to the plan…" test (if any) or the apply-easy-version test breaks because the protected-plan computation now returns a different default starter plan (`balanced-moderate` instead of `demoWeeklyPlan`), inspect the failure carefully. The two might differ in session ids (e.g. `mon-cf` exists in both, but specific titles or `warning` strings may differ). Fix the test to assert what the new starter exposes — DO NOT change the starter to satisfy a stale test.

- [ ] **Step 7: Commit (combined Task 4 + Task 5)**

Stage everything from both tasks and commit as one push (per Task 4 Step 7, the state changes alone would leave master broken):

```
git add src/domain/appState.ts src/domain/appState.test.ts \
        src/services/appPersistence.ts src/services/appPersistence.test.ts \
        src/App.tsx src/screens/PlanScreen.tsx src/screens/TodayScreen.tsx \
        src/__tests__/app.test.tsx src/styles.css
git rm src/domain/planTemplates.ts
git commit -m "feat: smart plan picker replaces variant cycling, bumps schema to v2"
git push origin master
```

Expected: commit and push succeed.

---

### Task 6: Final verification

**Files:**
- Modify only if verification exposes a real bug.

- [ ] **Step 1: Run canonical verify**

Run:
```
npm run verify
```

Expected: tests pass, secret scan passes, build succeeds.

- [ ] **Step 2: GitHub Pages build sanity check**

Run:
```
GITHUB_PAGES=true npx vite build
grep -oE 'href="[^"]*"|src="[^"]*"' dist/index.html
```

Expected: every asset path starts with `./assets/...`.

- [ ] **Step 3: Smoke check by re-reading the integrated files**

Since the harness is headless, re-read:
- `src/domain/appState.ts` — confirm `schemaVersion: 2`, `planTags`, `planRationale` present; `planVariantIndex` and `REGENERATE_WEEK` are gone.
- `src/App.tsx` — confirm `PICK_NEW_PLAN` is dispatched with `readiness`, `availability`, `goal`.
- `src/screens/PlanScreen.tsx` — confirm `tag-summary` (not variant-pill) renders.
- `src/screens/TodayScreen.tsx` — confirm `rationale-line` renders below CoachCard.
- `grep -rn "planTemplates\|planVariantIndex\|REGENERATE_WEEK" src/` should return zero matches.

- [ ] **Step 4: Commit any verification fixes**

If changes are needed, use:

```
git add src
git commit -m "fix: polish smart planner after final verify"
git push origin master
```

If no changes, skip.

---

## Self-Review Notes

- **Spec coverage:**
  - Library shape (`PlanEmphasis | PlanLoad | PlanVolume | PlanTags | TaggedPlan`, ~12 entries) → Tasks 1, 3.
  - Picker contract (`PickerInput`, `PickerResult`, rule weights, rationale templates, determinism, exclude/availability filters, fallback) → Task 2.
  - State changes (`planTags`, `planRationale`, drop `planVariantIndex`, `PICK_NEW_PLAN` with runtime payload, schema bump v2 drops v1 cleanly) → Task 4.
  - UI changes (PlanScreen tag summary, Today "Why this week" line, Regenerate button keeps label, integration test) → Task 5.
  - Final verification → Task 6.
- **Security coverage:** No new credential surfaces. All picking is local; no network calls; no user data leaves the device.
- **Scope control:** No LLM, no multi-week periodization, no drag-to-edit, no biometric integrations, no learning from logs.
- **Testing coverage:** Coverage tests for the library (Task 1, expanded Task 3). 11 rule-firing tests for the picker (Task 2). Updated reducer + persistence tests (Task 4). One new integration test for Regenerate week (Task 5).
- **Type consistency:** `PlanEmphasis | PlanLoad | PlanVolume | PlanTags | TaggedPlan | PickerInput | PickerResult` introduced in Tasks 1–2, consumed without renaming in Tasks 4–5. `findTaggedBySlug` defined in Task 1, used in `RESTORE_SESSION` reducer in Task 4.
- **Placeholder scan:** No TBDs, TODOs, or implement-later markers in steps.
- **Known caveats:**
  - **Task 4 leaves the working tree broken on purpose**, with the commit deferred to Task 5. This is the cleanest way to keep `origin/master` green at every push given the spec's tight coupling between the reducer and the UI consumer.
  - **Schema migration drops user data.** Spec acknowledges this. Implementer doesn't need to add user-facing messaging — the Reset prototype data button handles the only user-visible recovery path.
  - **Picker determinism test pins behavior, not specific slugs.** Library expansion in Task 3 may shift which entry wins for any given input. The test asserts that the SAME input twice produces the SAME output, which remains true after expansion.
