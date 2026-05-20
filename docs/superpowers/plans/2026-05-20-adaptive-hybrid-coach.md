# Adaptive Hybrid Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Adaptive Hybrid Coach frontend prototype that can be deployed to GitHub Pages and used as a polished training-planning preview.

**Architecture:** The app is a static Vite + React + TypeScript frontend with mocked/local data and deterministic planning rules. Screens consume typed domain models from `src/domain`, local persistence from `src/services`, and reusable UI components from `src/components`. AI/OCR and private synced storage are represented as reviewed mock flows only; no secrets or production API calls exist in the frontend.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, jsdom, lucide-react, GitHub Actions Pages deployment.

---

## File Structure

- `package.json`: npm scripts, frontend dependencies, test dependencies.
- `index.html`: Vite HTML entry.
- `vite.config.ts`: React plugin, Vitest config, GitHub Pages base path support.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript configuration.
- `.github/workflows/deploy-pages.yml`: GitHub Pages deployment workflow.
- `src/main.tsx`: React entrypoint.
- `src/App.tsx`: App shell, navigation, screen state, data orchestration.
- `src/styles.css`: Global visual system, responsive layout, premium cockpit styling.
- `src/domain/types.ts`: Shared training, planning, import, readiness, and recommendation types.
- `src/domain/demoData.ts`: Fake demo profile, workouts, plan, logs, and recommendations.
- `src/domain/planning.ts`: Deterministic coach/planning helpers.
- `src/domain/planning.test.ts`: Planning rule tests.
- `src/services/localStore.ts`: Safe local persistence wrapper.
- `src/services/localStore.test.ts`: Persistence tests.
- `src/components/AppChrome.tsx`: Responsive shell and bottom nav.
- `src/components/CoachCard.tsx`: Coach recommendation card.
- `src/components/MetricRing.tsx`: Readiness ring.
- `src/components/SessionCard.tsx`: Planned session display and state chips.
- `src/components/LoadBalance.tsx`: Weekly load balance visualization.
- `src/screens/TodayScreen.tsx`: Daily command center.
- `src/screens/PlanScreen.tsx`: Editable weekly plan preview.
- `src/screens/ImportScreen.tsx`: PushPress screenshot mock import and review.
- `src/screens/LogScreen.tsx`: Fast post-workout logging.
- `src/screens/ProfileScreen.tsx`: Profile, goals, PRs, availability, privacy.
- `src/__tests__/app.test.tsx`: App smoke and navigation tests.
- `scripts/check-no-secrets.mjs`: Static check for obvious frontend secret leaks.
- `README.md`: Setup, local development, GitHub Pages deployment, and security notes.

---

### Task 1: Scaffold Vite React App Foundation

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Create package and build configuration**

Create `package.json`:

```json
{
  "name": "adaptive-hybrid-coach",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:secrets": "node scripts/check-no-secrets.mjs",
    "verify": "npm run test && npm run check:secrets && npm run build"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.9.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "vitest": "^2.1.0"
  }
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? './' : '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/testSetup.ts',
    css: true
  }
});
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 2: Create the HTML and React entrypoint**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Adaptive Hybrid Coach prototype for CrossFit and running planning."
    />
    <title>Adaptive Hybrid Coach</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create temporary `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="startup-shell">
      <p className="eyebrow">Adaptive Hybrid Coach</p>
      <h1>Training cockpit loading.</h1>
      <p>Today, Plan, Import, Log, and Profile screens will be added next.</p>
    </main>
  );
}
```

Create temporary `src/styles.css`:

```css
:root {
  color: #ecf2ff;
  background: #070b12;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(77, 144, 120, 0.28), transparent 34rem),
    linear-gradient(135deg, #070b12 0%, #111923 52%, #101214 100%);
}

button,
input,
select,
textarea {
  font: inherit;
}

.startup-shell {
  display: grid;
  min-height: 100vh;
  align-content: center;
  gap: 0.75rem;
  padding: 2rem;
}

.eyebrow {
  margin: 0;
  color: #7ee0b2;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 4: Verify foundation**

Run: `npm run build`

Expected: TypeScript passes and Vite writes `dist/`.

- [ ] **Step 5: Commit foundation**

Run:

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json src
git commit -m "chore: scaffold adaptive coach frontend"
```

Expected: commit succeeds.

---

### Task 2: Add Domain Types, Demo Data, And Planning Rules

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/demoData.ts`
- Create: `src/domain/planning.ts`
- Create: `src/domain/planning.test.ts`
- Create: `src/testSetup.ts`
- Modify: `package.json`

- [ ] **Step 1: Add test setup**

Create `src/testSetup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Create domain types**

Create `src/domain/types.ts`:

```ts
export type SessionType = 'crossfit' | 'easy-run' | 'quality-run' | 'long-run' | 'rest' | 'recovery';
export type Intensity = 'low' | 'moderate' | 'high';
export type ReviewState = 'needs-review' | 'approved';
export type CompletionState = 'planned' | 'completed' | 'modified' | 'skipped' | 'moved';

export interface AthleteProfile {
  name: string;
  age: number;
  heightCm: number;
  trainingAgeYears: number;
  runningBaseline: string;
  currentGoal: string;
  weeklyAvailability: AvailabilityWindow[];
  prs: PersonalRecord[];
  injuryFlags: string[];
  preferredUnits: 'metric' | 'imperial';
}

export interface AvailabilityWindow {
  day: string;
  available: boolean;
  minutes: number;
}

export interface PersonalRecord {
  lift: string;
  value: string;
}

export interface WorkoutTag {
  label: string;
  level: Intensity;
}

export interface ImportedWorkout {
  id: string;
  day: string;
  source: 'pushpress-screenshot' | 'manual';
  title: string;
  extractedText: string;
  confidence: number;
  reviewState: ReviewState;
  tags: WorkoutTag[];
  lowerBodyLoad: Intensity;
  metconIntensity: Intensity;
  fatigueImpact: Intensity;
}

export interface PlannedSession {
  id: string;
  day: string;
  type: SessionType;
  title: string;
  purpose: string;
  durationMinutes: number;
  intensity: Intensity;
  status: CompletionState;
  warning?: string;
}

export interface WeeklyPlan {
  weekLabel: string;
  sessions: PlannedSession[];
}

export interface TrainingLog {
  sessionId: string;
  completion: CompletionState;
  rpe: number;
  durationMinutes: number;
  notes: string;
}

export interface ReadinessCheckIn {
  soreness: number;
  energy: number;
  sleepQuality: number;
  mood: number;
  painFlag: boolean;
}

export interface CoachRecommendation {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'caution' | 'recovery';
  actionLabel: string;
}
```

- [ ] **Step 3: Add fake demo data**

Create `src/domain/demoData.ts`:

```ts
import type {
  AthleteProfile,
  CoachRecommendation,
  ImportedWorkout,
  ReadinessCheckIn,
  TrainingLog,
  WeeklyPlan
} from './types';

export const demoProfile: AthleteProfile = {
  name: 'Kai',
  age: 32,
  heightCm: 176,
  trainingAgeYears: 5,
  runningBaseline: 'Comfortable 5K, rebuilding consistent weekly mileage',
  currentGoal: 'Improve running while keeping CrossFit performance sharp',
  preferredUnits: 'metric',
  injuryFlags: ['Watch left calf tightness after intervals'],
  weeklyAvailability: [
    { day: 'Mon', available: true, minutes: 75 },
    { day: 'Tue', available: true, minutes: 60 },
    { day: 'Wed', available: true, minutes: 60 },
    { day: 'Thu', available: true, minutes: 45 },
    { day: 'Fri', available: true, minutes: 60 },
    { day: 'Sat', available: true, minutes: 90 },
    { day: 'Sun', available: false, minutes: 0 }
  ],
  prs: [
    { lift: 'Back squat', value: '150 kg' },
    { lift: 'Deadlift', value: '185 kg' },
    { lift: 'Clean and jerk', value: '105 kg' },
    { lift: 'Snatch', value: '82.5 kg' }
  ]
};

export const demoImportedWorkouts: ImportedWorkout[] = [
  {
    id: 'cf-mon',
    day: 'Mon',
    source: 'pushpress-screenshot',
    title: 'Back squat + short metcon',
    extractedText: '5x3 back squat, then 10 min AMRAP: wall balls, box jumps, burpees',
    confidence: 0.86,
    reviewState: 'approved',
    lowerBodyLoad: 'high',
    metconIntensity: 'high',
    fatigueImpact: 'high',
    tags: [
      { label: 'lower body', level: 'high' },
      { label: 'metcon', level: 'high' },
      { label: 'jumping', level: 'moderate' }
    ]
  },
  {
    id: 'cf-wed',
    day: 'Wed',
    source: 'pushpress-screenshot',
    title: 'Gymnastics skill + engine',
    extractedText: 'Pull-up skill work, then intervals on rower and dumbbell snatches',
    confidence: 0.72,
    reviewState: 'needs-review',
    lowerBodyLoad: 'moderate',
    metconIntensity: 'moderate',
    fatigueImpact: 'moderate',
    tags: [
      { label: 'upper pull', level: 'moderate' },
      { label: 'engine', level: 'moderate' }
    ]
  }
];

export const demoWeeklyPlan: WeeklyPlan = {
  weekLabel: 'May 20-26',
  sessions: [
    {
      id: 'mon-cf',
      day: 'Mon',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Strength and metcon anchor',
      durationMinutes: 60,
      intensity: 'high',
      status: 'planned',
      warning: 'Avoid hard running after this lower-body load.'
    },
    {
      id: 'tue-run',
      day: 'Tue',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Build durability without adding intensity',
      durationMinutes: 35,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'wed-cf',
      day: 'Wed',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Skill and moderate engine work',
      durationMinutes: 60,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'thu-quality',
      day: 'Thu',
      type: 'quality-run',
      title: 'Controlled intervals',
      purpose: 'Improve running speed with capped fatigue',
      durationMinutes: 42,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'sat-long',
      day: 'Sat',
      type: 'long-run',
      title: 'Long easy run',
      purpose: 'Extend aerobic base',
      durationMinutes: 55,
      intensity: 'low',
      status: 'planned'
    }
  ]
};

export const demoReadiness: ReadinessCheckIn = {
  soreness: 6,
  energy: 7,
  sleepQuality: 6,
  mood: 7,
  painFlag: false
};

export const demoLogs: TrainingLog[] = [
  {
    sessionId: 'mon-cf',
    completion: 'completed',
    rpe: 8,
    durationMinutes: 62,
    notes: 'Squats felt heavy but clean. Legs cooked after box jumps.'
  }
];

export const demoRecommendations: CoachRecommendation[] = [
  {
    id: 'protect-tue',
    title: 'Keep Tuesday easy',
    body: 'Monday had high lower-body load and high metcon intensity. Keep the run aerobic and skip strides.',
    severity: 'caution',
    actionLabel: 'Apply easy version'
  }
];
```

- [ ] **Step 4: Write failing planning tests**

Create `src/domain/planning.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { demoWeeklyPlan } from './demoData';
import {
  calculateReadinessScore,
  createCoachRecommendation,
  getWeeklyBalance,
  protectRunsAfterHeavyLowerBody
} from './planning';
import type { ImportedWorkout, ReadinessCheckIn } from './types';

describe('planning helpers', () => {
  it('calculates a readiness score from sleep, energy, soreness, and pain', () => {
    const checkIn: ReadinessCheckIn = {
      soreness: 7,
      energy: 6,
      sleepQuality: 5,
      mood: 7,
      painFlag: false
    };

    expect(calculateReadinessScore(checkIn)).toBe(58);
  });

  it('drops readiness sharply when pain is flagged', () => {
    const checkIn: ReadinessCheckIn = {
      soreness: 3,
      energy: 8,
      sleepQuality: 8,
      mood: 8,
      painFlag: true
    };

    expect(calculateReadinessScore(checkIn)).toBe(48);
  });

  it('warns when a hard run follows high lower-body CrossFit load', () => {
    const workout: ImportedWorkout = {
      id: 'cf-mon',
      day: 'Mon',
      source: 'pushpress-screenshot',
      title: 'Squat day',
      extractedText: 'Heavy squats and box jumps',
      confidence: 0.9,
      reviewState: 'approved',
      lowerBodyLoad: 'high',
      metconIntensity: 'high',
      fatigueImpact: 'high',
      tags: []
    };

    const protectedPlan = protectRunsAfterHeavyLowerBody(demoWeeklyPlan, [workout]);
    const tuesdayRun = protectedPlan.sessions.find((session) => session.id === 'tue-run');

    expect(tuesdayRun?.intensity).toBe('low');
    expect(tuesdayRun?.warning).toContain('lower-body');
  });

  it('summarizes weekly balance without exposing distracting stats', () => {
    expect(getWeeklyBalance(demoWeeklyPlan)).toEqual({
      crossfitSessions: 2,
      runSessions: 3,
      hardSessions: 1,
      balanceLabel: 'Balanced hybrid week'
    });
  });

  it('creates conservative recommendations for low readiness', () => {
    const recommendation = createCoachRecommendation({
      soreness: 8,
      energy: 3,
      sleepQuality: 4,
      mood: 5,
      painFlag: false
    });

    expect(recommendation.severity).toBe('recovery');
    expect(recommendation.title).toBe('Reduce intensity today');
  });
});
```

- [ ] **Step 5: Run tests and verify they fail**

Run: `npm run test -- src/domain/planning.test.ts`

Expected: FAIL because `src/domain/planning.ts` does not exist yet.

- [ ] **Step 6: Implement planning helpers**

Create `src/domain/planning.ts`:

```ts
import type {
  CoachRecommendation,
  ImportedWorkout,
  Intensity,
  PlannedSession,
  ReadinessCheckIn,
  SessionType,
  WeeklyPlan
} from './types';

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function nextDay(day: string) {
  const index = dayOrder.indexOf(day);
  return dayOrder[(index + 1) % dayOrder.length];
}

function isRun(type: SessionType) {
  return type === 'easy-run' || type === 'quality-run' || type === 'long-run';
}

function isHardSession(session: PlannedSession) {
  return session.intensity === 'high' || session.type === 'quality-run';
}

function protectIntensity(current: Intensity): Intensity {
  return current === 'high' ? 'moderate' : current;
}

export function calculateReadinessScore(checkIn: ReadinessCheckIn) {
  const recovery = 10 - checkIn.soreness;
  const base = (recovery * 0.3 + checkIn.energy * 0.3 + checkIn.sleepQuality * 0.25 + checkIn.mood * 0.15) * 10;
  const painPenalty = checkIn.painFlag ? 30 : 0;
  return Math.max(0, Math.round(base - painPenalty));
}

export function protectRunsAfterHeavyLowerBody(plan: WeeklyPlan, workouts: ImportedWorkout[]): WeeklyPlan {
  const protectedDays = new Set(
    workouts
      .filter((workout) => workout.reviewState === 'approved' && workout.lowerBodyLoad === 'high')
      .map((workout) => nextDay(workout.day))
  );

  return {
    ...plan,
    sessions: plan.sessions.map((session) => {
      if (!protectedDays.has(session.day) || !isRun(session.type)) {
        return session;
      }

      return {
        ...session,
        intensity: protectIntensity(session.intensity),
        warning: 'Protected after high lower-body CrossFit load.'
      };
    })
  };
}

export function getWeeklyBalance(plan: WeeklyPlan) {
  const crossfitSessions = plan.sessions.filter((session) => session.type === 'crossfit').length;
  const runSessions = plan.sessions.filter((session) => isRun(session.type)).length;
  const hardSessions = plan.sessions.filter(isHardSession).length;
  const balanceLabel =
    crossfitSessions >= 2 && runSessions >= 2 && hardSessions <= 2
      ? 'Balanced hybrid week'
      : 'Needs coach review';

  return {
    crossfitSessions,
    runSessions,
    hardSessions,
    balanceLabel
  };
}

export function createCoachRecommendation(checkIn: ReadinessCheckIn): CoachRecommendation {
  const readiness = calculateReadinessScore(checkIn);

  if (checkIn.painFlag) {
    return {
      id: 'pain-flag',
      title: 'Protect the pain signal',
      body: 'Pain was flagged today. Keep training conservative and avoid intensity until this settles.',
      severity: 'recovery',
      actionLabel: 'Switch to recovery'
    };
  }

  if (readiness < 60) {
    return {
      id: 'low-readiness',
      title: 'Reduce intensity today',
      body: 'Readiness is low from soreness, sleep, or energy. Keep the next session easy and preserve consistency.',
      severity: 'recovery',
      actionLabel: 'Apply easier session'
    };
  }

  return {
    id: 'steady-plan',
    title: 'Plan looks balanced',
    body: 'Readiness supports the current plan. Keep the intended intensity and log how it feels after.',
    severity: 'info',
    actionLabel: 'Keep plan'
  };
}
```

- [ ] **Step 7: Run tests and verify they pass**

Run: `npm run test -- src/domain/planning.test.ts`

Expected: PASS for all planning helper tests.

- [ ] **Step 8: Commit domain layer**

Run:

```bash
git add src/domain src/testSetup.ts package.json
git commit -m "feat: add adaptive coach domain rules"
```

Expected: commit succeeds.

---

### Task 3: Build App Chrome And Reusable Components

**Files:**
- Create: `src/components/AppChrome.tsx`
- Create: `src/components/CoachCard.tsx`
- Create: `src/components/MetricRing.tsx`
- Create: `src/components/SessionCard.tsx`
- Create: `src/components/LoadBalance.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create app chrome**

Create `src/components/AppChrome.tsx`:

```tsx
import { CalendarDays, Dumbbell, Home, ListChecks, UploadCloud, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

export type ScreenKey = 'today' | 'plan' | 'import' | 'log' | 'profile';

interface AppChromeProps {
  activeScreen: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  children: ReactNode;
}

const navItems = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'plan', label: 'Plan', icon: CalendarDays },
  { key: 'import', label: 'Import', icon: UploadCloud },
  { key: 'log', label: 'Log', icon: ListChecks },
  { key: 'profile', label: 'Profile', icon: UserRound }
] as const;

export function AppChrome({ activeScreen, onNavigate, children }: AppChromeProps) {
  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Primary navigation">
        <div className="brand-lockup">
          <Dumbbell aria-hidden="true" />
          <div>
            <strong>Hybrid Coach</strong>
            <span>CrossFit + running</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? 'nav-item is-active' : 'nav-item'}
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="screen-frame">{children}</div>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={isActive ? 'bottom-nav-item is-active' : 'bottom-nav-item'}
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Create focused UI components**

Create `src/components/CoachCard.tsx`:

```tsx
import { ShieldAlert, Sparkles } from 'lucide-react';
import type { CoachRecommendation } from '../domain/types';

interface CoachCardProps {
  recommendation: CoachRecommendation;
}

export function CoachCard({ recommendation }: CoachCardProps) {
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
        <button type="button" className="primary-action">
          {recommendation.actionLabel}
        </button>
      </div>
    </section>
  );
}
```

Create `src/components/MetricRing.tsx`:

```tsx
import type { CSSProperties } from 'react';

interface MetricRingProps {
  label: string;
  value: number;
}

export function MetricRing({ label, value }: MetricRingProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className="metric-ring"
      style={{ '--ring-value': `${normalized}%` } as CSSProperties}
      aria-label={`${label}: ${normalized} out of 100`}
    >
      <div>
        <strong>{normalized}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
```

Create `src/components/SessionCard.tsx`:

```tsx
import { AlertTriangle, Clock3 } from 'lucide-react';
import type { PlannedSession } from '../domain/types';

interface SessionCardProps {
  session: PlannedSession;
}

export function SessionCard({ session }: SessionCardProps) {
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
    </article>
  );
}
```

Create `src/components/LoadBalance.tsx`:

```tsx
interface LoadBalanceProps {
  crossfitSessions: number;
  runSessions: number;
  hardSessions: number;
  label: string;
}

export function LoadBalance({ crossfitSessions, runSessions, hardSessions, label }: LoadBalanceProps) {
  const total = Math.max(1, crossfitSessions + runSessions);
  const crossfitPercent = Math.round((crossfitSessions / total) * 100);
  const runPercent = 100 - crossfitPercent;

  return (
    <section className="load-balance">
      <div className="section-heading">
        <p className="eyebrow">Weekly balance</p>
        <h2>{label}</h2>
      </div>
      <div className="load-bar" aria-label={`CrossFit ${crossfitPercent} percent, running ${runPercent} percent`}>
        <span style={{ width: `${crossfitPercent}%` }} />
        <span style={{ width: `${runPercent}%` }} />
      </div>
      <div className="load-balance__stats">
        <span>{crossfitSessions} CrossFit</span>
        <span>{runSessions} runs</span>
        <span>{hardSessions} hard</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Replace global CSS with production visual system**

Replace `src/styles.css` with the complete app CSS:

```css
:root {
  color: #ecf2ff;
  background: #070b12;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(76, 146, 121, 0.28), transparent 28rem),
    radial-gradient(circle at 95% 10%, rgba(79, 123, 179, 0.22), transparent 24rem),
    linear-gradient(135deg, #070b12 0%, #101820 52%, #111314 100%);
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: grid;
  grid-template-columns: 17rem minmax(0, 1fr);
  min-height: 100vh;
}

.side-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 100vh;
  padding: 1.25rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(6, 10, 17, 0.72);
  backdrop-filter: blur(18px);
}

.brand-lockup,
.nav-item,
.bottom-nav-item,
.session-meta,
.warning-line {
  display: flex;
  align-items: center;
}

.brand-lockup {
  gap: 0.75rem;
}

.brand-lockup svg {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0.55rem;
  border-radius: 0.8rem;
  color: #7ee0b2;
  background: rgba(126, 224, 178, 0.12);
}

.brand-lockup strong,
.brand-lockup span {
  display: block;
}

.brand-lockup span {
  color: #97a4b8;
  font-size: 0.78rem;
}

.side-nav nav {
  display: grid;
  gap: 0.45rem;
}

.nav-item,
.bottom-nav-item {
  gap: 0.7rem;
  border: 0;
  color: #9eabbf;
  background: transparent;
}

.nav-item {
  width: 100%;
  padding: 0.85rem;
  border-radius: 0.8rem;
  text-align: left;
}

.nav-item.is-active,
.bottom-nav-item.is-active {
  color: #f7fbff;
  background: rgba(126, 224, 178, 0.13);
}

.nav-item svg,
.bottom-nav-item svg {
  width: 1.15rem;
  height: 1.15rem;
}

.screen-frame {
  width: min(100%, 76rem);
  margin: 0 auto;
  padding: 1.5rem 1.5rem 6rem;
}

.screen-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.screen-header h1,
.section-heading h2,
.coach-card h2,
.session-card h3 {
  margin: 0;
}

.screen-header h1 {
  font-size: clamp(1.8rem, 3vw, 3rem);
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #7ee0b2;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.panel,
.coach-card,
.session-card,
.load-balance,
.profile-card {
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 0.95rem;
  background: rgba(17, 24, 34, 0.78);
  box-shadow: 0 1.3rem 3rem rgba(0, 0, 0, 0.24);
}

.panel,
.load-balance,
.profile-card {
  padding: 1rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid.two {
  grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr);
}

.grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.coach-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.coach-card__icon {
  display: grid;
  width: 2.7rem;
  height: 2.7rem;
  place-items: center;
  border-radius: 0.8rem;
  color: #07110d;
  background: #7ee0b2;
}

.coach-card p,
.session-card p,
.profile-card p {
  color: #aab5c5;
}

.primary-action,
.secondary-action {
  min-height: 2.5rem;
  padding: 0 0.95rem;
  border-radius: 0.8rem;
  font-weight: 750;
}

.primary-action {
  border: 0;
  color: #07110d;
  background: #7ee0b2;
}

.secondary-action {
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #ecf2ff;
  background: rgba(255, 255, 255, 0.06);
}

.metric-ring {
  display: grid;
  width: 9.5rem;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  background:
    radial-gradient(circle, #111923 58%, transparent 59%),
    conic-gradient(#7ee0b2 var(--ring-value), rgba(255, 255, 255, 0.12) 0);
}

.metric-ring strong,
.metric-ring span {
  display: block;
  text-align: center;
}

.metric-ring strong {
  font-size: 2.25rem;
}

.metric-ring span {
  color: #aab5c5;
  font-size: 0.78rem;
}

.session-card {
  padding: 1rem;
}

.session-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.session-day {
  color: #7ee0b2;
  font-size: 0.75rem;
  font-weight: 800;
}

.intensity-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: capitalize;
}

.intensity-chip.low {
  color: #8ff0bd;
  background: rgba(126, 224, 178, 0.12);
}

.intensity-chip.moderate {
  color: #ffd27a;
  background: rgba(255, 210, 122, 0.14);
}

.intensity-chip.high {
  color: #ff9c9c;
  background: rgba(255, 111, 111, 0.14);
}

.session-meta,
.warning-line {
  gap: 0.6rem;
  color: #aab5c5;
  font-size: 0.86rem;
}

.session-meta svg,
.warning-line svg {
  width: 1rem;
  height: 1rem;
}

.warning-line {
  margin-top: 0.8rem;
  color: #ffd27a;
}

.load-bar {
  display: flex;
  height: 0.85rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.load-bar span:first-child {
  background: #7ee0b2;
}

.load-bar span:last-child {
  background: #80a8ff;
}

.load-balance__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.8rem;
  color: #aab5c5;
}

.bottom-nav {
  position: fixed;
  right: 0.75rem;
  bottom: 0.75rem;
  left: 0.75rem;
  display: none;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.25rem;
  padding: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background: rgba(6, 10, 17, 0.9);
  backdrop-filter: blur(18px);
}

.bottom-nav-item {
  flex-direction: column;
  justify-content: center;
  min-height: 3.2rem;
  border-radius: 0.75rem;
  font-size: 0.7rem;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .side-nav {
    display: none;
  }

  .bottom-nav {
    display: grid;
  }

  .screen-frame {
    padding: 1rem 1rem 6rem;
  }

  .screen-header,
  .grid.two,
  .grid.three {
    grid-template-columns: 1fr;
  }

  .screen-header {
    display: grid;
  }
}
```

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: build succeeds after components compile.

- [ ] **Step 5: Commit UI components**

Run:

```bash
git add src/components src/styles.css
git commit -m "feat: add coach app chrome and components"
```

Expected: commit succeeds.

---

### Task 4: Build Screens And App State

**Files:**
- Create: `src/screens/TodayScreen.tsx`
- Create: `src/screens/PlanScreen.tsx`
- Create: `src/screens/ImportScreen.tsx`
- Create: `src/screens/LogScreen.tsx`
- Create: `src/screens/ProfileScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create Today screen**

Create `src/screens/TodayScreen.tsx`:

```tsx
import { CoachCard } from '../components/CoachCard';
import { LoadBalance } from '../components/LoadBalance';
import { MetricRing } from '../components/MetricRing';
import { SessionCard } from '../components/SessionCard';
import type { CoachRecommendation, PlannedSession, ReadinessCheckIn, WeeklyPlan } from '../domain/types';
import { calculateReadinessScore, getWeeklyBalance } from '../domain/planning';

interface TodayScreenProps {
  plan: WeeklyPlan;
  readiness: ReadinessCheckIn;
  recommendation: CoachRecommendation;
}

export function TodayScreen({ plan, readiness, recommendation }: TodayScreenProps) {
  const nextSession = plan.sessions.find((session) => session.status === 'planned') as PlannedSession;
  const readinessScore = calculateReadinessScore(readiness);
  const balance = getWeeklyBalance(plan);

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
          <CoachCard recommendation={recommendation} />
          <SessionCard session={nextSession} />
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

- [ ] **Step 2: Create Plan screen**

Create `src/screens/PlanScreen.tsx`:

```tsx
import { SessionCard } from '../components/SessionCard';
import type { WeeklyPlan } from '../domain/types';

interface PlanScreenProps {
  plan: WeeklyPlan;
}

export function PlanScreen({ plan }: PlanScreenProps) {
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
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Import screen**

Create `src/screens/ImportScreen.tsx`:

```tsx
import { CheckCircle2, UploadCloud } from 'lucide-react';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
}

export function ImportScreen({ workouts }: ImportScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <button type="button" className="primary-action">
          <UploadCloud aria-hidden="true" /> Upload screenshot
        </button>
      </header>
      <div className="grid">
        {workouts.map((workout) => (
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
              <span className="status-chip">
                <CheckCircle2 aria-hidden="true" />
                {workout.reviewState === 'approved' ? 'approved' : 'needs review'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Log screen**

Create `src/screens/LogScreen.tsx`:

```tsx
export function LogScreen() {
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

- [ ] **Step 5: Create Profile screen**

Create `src/screens/ProfileScreen.tsx`:

```tsx
import type { AthleteProfile } from '../domain/types';

interface ProfileScreenProps {
  profile: AthleteProfile;
}

export function ProfileScreen({ profile }: ProfileScreenProps) {
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
    </div>
  );
}
```

- [ ] **Step 6: Wire screens into App**

Replace `src/App.tsx`:

```tsx
import { useState } from 'react';
import { AppChrome, type ScreenKey } from './components/AppChrome';
import {
  demoImportedWorkouts,
  demoProfile,
  demoReadiness,
  demoRecommendations,
  demoWeeklyPlan
} from './domain/demoData';
import { protectRunsAfterHeavyLowerBody } from './domain/planning';
import { ImportScreen } from './screens/ImportScreen';
import { LogScreen } from './screens/LogScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TodayScreen } from './screens/TodayScreen';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('today');
  const protectedPlan = protectRunsAfterHeavyLowerBody(demoWeeklyPlan, demoImportedWorkouts);

  return (
    <AppChrome activeScreen={activeScreen} onNavigate={setActiveScreen}>
      {activeScreen === 'today' ? (
        <TodayScreen
          plan={protectedPlan}
          readiness={demoReadiness}
          recommendation={demoRecommendations[0]}
        />
      ) : null}
      {activeScreen === 'plan' ? <PlanScreen plan={protectedPlan} /> : null}
      {activeScreen === 'import' ? <ImportScreen workouts={demoImportedWorkouts} /> : null}
      {activeScreen === 'log' ? <LogScreen /> : null}
      {activeScreen === 'profile' ? <ProfileScreen profile={demoProfile} /> : null}
    </AppChrome>
  );
}
```

- [ ] **Step 7: Add screen-specific CSS**

Append to `src/styles.css`:

```css
.import-card {
  display: grid;
  gap: 1rem;
}

.tag-row,
.import-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-chip {
  gap: 0.35rem;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.08);
}

.status-chip svg {
  width: 1rem;
  height: 1rem;
}

.log-form {
  display: grid;
  gap: 1rem;
}

.log-form label {
  display: grid;
  gap: 0.45rem;
  color: #cbd5e1;
  font-weight: 700;
}

.log-form input,
.log-form select,
.log-form textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.8rem;
  color: #ecf2ff;
  background: rgba(255, 255, 255, 0.06);
}

.log-form input,
.log-form select {
  min-height: 2.8rem;
  padding: 0 0.8rem;
}

.log-form textarea {
  padding: 0.8rem;
  resize: vertical;
}

.profile-list {
  display: grid;
  gap: 0.6rem;
}

.profile-list span {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #aab5c5;
}

.profile-list span:last-child {
  border-bottom: 0;
}

.profile-list strong {
  color: #ecf2ff;
}
```

- [ ] **Step 8: Verify screens build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 9: Commit screens**

Run:

```bash
git add src/App.tsx src/screens src/styles.css
git commit -m "feat: build hybrid coach screens"
```

Expected: commit succeeds.

---

### Task 5: Add Local Persistence And Interaction Tests

**Files:**
- Create: `src/services/localStore.ts`
- Create: `src/services/localStore.test.ts`
- Create: `src/__tests__/app.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add local storage wrapper**

Create `src/services/localStore.ts`:

```ts
export function loadLocalValue<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalValue<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Add persistence tests**

Create `src/services/localStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLocalValue, saveLocalValue } from './localStore';

describe('localStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads fallback when no value exists', () => {
    expect(loadLocalValue('missing', 'fallback')).toBe('fallback');
  });

  it('saves and loads JSON values', () => {
    expect(saveLocalValue('screen', 'plan')).toBe(true);
    expect(loadLocalValue('screen', 'today')).toBe('plan');
  });

  it('returns fallback when stored data is invalid JSON', () => {
    window.localStorage.setItem('bad', '{');
    expect(loadLocalValue('bad', 'safe')).toBe('safe');
  });

  it('reports failed saves without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(saveLocalValue('screen', 'today')).toBe(false);
  });
});
```

- [ ] **Step 3: Persist active screen**

Modify `src/App.tsx` so it uses the persistence helpers:

```tsx
import { useState } from 'react';
import { AppChrome, type ScreenKey } from './components/AppChrome';
import {
  demoImportedWorkouts,
  demoProfile,
  demoReadiness,
  demoRecommendations,
  demoWeeklyPlan
} from './domain/demoData';
import { protectRunsAfterHeavyLowerBody } from './domain/planning';
import { ImportScreen } from './screens/ImportScreen';
import { LogScreen } from './screens/LogScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TodayScreen } from './screens/TodayScreen';
import { loadLocalValue, saveLocalValue } from './services/localStore';

function isScreenKey(value: string): value is ScreenKey {
  return ['today', 'plan', 'import', 'log', 'profile'].includes(value);
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(() => {
    const stored = loadLocalValue('hybrid-coach-active-screen', 'today');
    return isScreenKey(stored) ? stored : 'today';
  });
  const protectedPlan = protectRunsAfterHeavyLowerBody(demoWeeklyPlan, demoImportedWorkouts);

  function navigate(screen: ScreenKey) {
    setActiveScreen(screen);
    saveLocalValue('hybrid-coach-active-screen', screen);
  }

  return (
    <AppChrome activeScreen={activeScreen} onNavigate={navigate}>
      {activeScreen === 'today' ? (
        <TodayScreen
          plan={protectedPlan}
          readiness={demoReadiness}
          recommendation={demoRecommendations[0]}
        />
      ) : null}
      {activeScreen === 'plan' ? <PlanScreen plan={protectedPlan} /> : null}
      {activeScreen === 'import' ? <ImportScreen workouts={demoImportedWorkouts} /> : null}
      {activeScreen === 'log' ? <LogScreen /> : null}
      {activeScreen === 'profile' ? <ProfileScreen profile={demoProfile} /> : null}
    </AppChrome>
  );
}
```

- [ ] **Step 4: Add app interaction tests**

Create `src/__tests__/app.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
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

- [ ] **Step 5: Run tests**

Run: `npm run test`

Expected: all tests pass.

- [ ] **Step 6: Commit persistence and tests**

Run:

```bash
git add src/services src/__tests__ src/App.tsx
git commit -m "test: cover app navigation and local persistence"
```

Expected: commit succeeds.

---

### Task 6: Add GitHub Pages Deployment And Security Check

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Create: `scripts/check-no-secrets.mjs`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Create GitHub Pages workflow**

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [master, main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install
        run: npm ci

      - name: Verify
        run: npm run verify

      - name: Build for Pages
        run: GITHUB_PAGES=true npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add no-secrets check**

Create `scripts/check-no-secrets.mjs`:

```js
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ignoredDirs = new Set(['.git', 'dist', 'node_modules', '.superpowers']);
const checkedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.yml']);
const forbiddenPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /OPENAI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /OCR_API_KEY/i,
  /VITE_.*SECRET/i,
  /VITE_.*API_KEY/i
];

function extensionOf(fileName) {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index);
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return ignoredDirs.has(name) ? [] : listFiles(path);
    }

    return checkedExtensions.has(extensionOf(name)) ? [path] : [];
  });
}

const offenders = [];

for (const file of listFiles(process.cwd())) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      offenders.push(`${file} matched ${pattern}`);
    }
  }
}

if (offenders.length > 0) {
  console.error('Potential frontend secret leak detected:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('No obvious frontend secrets detected.');
```

- [ ] **Step 3: Add README**

Create `README.md`:

```md
# Adaptive Hybrid Coach

Mobile-first frontend prototype for a CrossFit + running coach companion.

## What it does

- Shows a focused Today command center.
- Builds an editable weekly hybrid training plan from demo data.
- Reviews mocked PushPress screenshot imports before they affect planning.
- Logs simple post-workout feedback.
- Keeps profile, PR, availability, and privacy context visible.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run verify
```

This runs tests, checks for obvious frontend secret leaks, and builds the app.

## GitHub Pages

The app is designed to deploy as a static GitHub Pages site. The workflow in `.github/workflows/deploy-pages.yml` builds the app with `GITHUB_PAGES=true` so Vite uses relative asset paths that work under a project Pages URL.

After pushing to GitHub, enable Pages for GitHub Actions in the repository settings.

## Security boundary

This prototype must not contain API keys or real private training data. GitHub Pages hosts only the static frontend. Future OCR, AI extraction, account authentication, and synced storage must run through a secure backend.
```

- [ ] **Step 4: Run full verification**

Run: `npm run verify`

Expected: tests pass, secret check prints `No obvious frontend secrets detected.`, and build succeeds.

- [ ] **Step 5: Commit deployment and security**

Run:

```bash
git add .github scripts README.md package.json
git commit -m "ci: add github pages deployment"
```

Expected: commit succeeds.

---

### Task 7: Final Mobile Preview Verification

**Files:**
- Modify only if verification exposes a real bug.

- [ ] **Step 1: Start local dev server**

Run: `npm run dev`

Expected: Vite prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Verify desktop viewport**

Open the local URL. Confirm:

- Side navigation is visible.
- Today screen is first.
- No text overlaps.
- Coach recommendation is visible.
- Plan, Import, Log, and Profile navigation works.

- [ ] **Step 3: Verify mobile viewport**

Use browser responsive mode around `390x844`. Confirm:

- Bottom navigation is visible.
- Side navigation is hidden.
- Cards stack cleanly.
- Buttons are tappable.
- Long text wraps within panels.
- Today screen does not show unnecessary stats.

- [ ] **Step 4: Run production preview**

Run:

```bash
npm run build
npm run preview
```

Expected: production preview loads and matches the dev app.

- [ ] **Step 5: Commit any verification fixes**

If changes were needed, run:

```bash
git add src README.md
git commit -m "fix: polish mobile training cockpit preview"
```

Expected: commit succeeds if files changed. Skip this commit if no files changed.

---

## Self-Review Notes

- Spec coverage: The plan covers the approved Today, Plan, Import, Log, and Profile screens; mobile-first premium-but-focused UX; GitHub Pages preview; local/mock data; conservative planning rules; reviewed screenshot imports; and frontend secret checks.
- Security coverage: The plan explicitly prevents browser secrets and production API calls, keeps AI/OCR mocked, and documents the future backend boundary.
- Scope control: The plan does not add nutrition, wearables, calendar sync, accounts, or real PushPress integration.
- Testing coverage: Planning rules, local persistence, app navigation, build, and secret checks are covered.
