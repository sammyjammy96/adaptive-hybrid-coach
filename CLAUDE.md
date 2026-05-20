# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Adaptive Hybrid Coach — a mobile-first React 19 + Vite + TypeScript prototype for a CrossFit + running coach companion. Static frontend only, deployed to GitHub Pages. There is intentionally **no backend**, **no auth**, and **no real user data** — all data is demo data shipped in the bundle.

## Commands

```bash
npm run dev              # Vite dev server, bound to 0.0.0.0
npm run build            # tsc --noEmit && vite build (type errors fail the build)
npm run test             # vitest run (single pass)
npm run test:watch       # vitest in watch mode
npm run check:secrets    # scans repo for API key patterns; fails on match
npm run verify           # test + check:secrets + build (the canonical pre-merge gate)
```

Run a single test file:
```bash
npx vitest run src/domain/planning.test.ts
```

Run tests matching a name:
```bash
npx vitest run -t "protectRunsAfterHeavyLowerBody"
```

Vitest config lives inside `vite.config.ts` (jsdom env, globals on, setup file `src/testSetup.ts`). There is no separate `vitest.config`.

## Architecture

### Shell + screens

`src/main.tsx` mounts `<App />`. `src/App.tsx` is the single source of routing: it holds a `ScreenKey` state (`'today' | 'plan' | 'import' | 'log' | 'profile'`), persists it via `services/localStore`, and conditionally renders one of five screen components inside `components/AppChrome`. `AppChrome` renders both a side nav (desktop) and a bottom nav (mobile) from the same `navItems` list. There is no router library — adding a screen means: extend `ScreenKey`, add to `navItems`, add a branch in `App.tsx`, add the screen file under `src/screens/`.

### Layered structure

- **`src/domain/`** — pure TS, no React. `types.ts` is the canonical schema for every entity (`AthleteProfile`, `WeeklyPlan`, `PlannedSession`, `ImportedWorkout`, `ReadinessCheckIn`, `CoachRecommendation`, etc.). `planning.ts` holds the business logic (readiness score, run protection after heavy lower-body CrossFit, weekly balance, coach recommendations). `demoData.ts` exports the fixtures the UI runs on. **All planning logic is pure and unit-tested in `planning.test.ts`** — keep new rules pure and add tests there.
- **`src/screens/`** — one component per top-level screen. Receive their data as props from `App.tsx`; do not fetch.
- **`src/components/`** — shared presentational pieces (`AppChrome`, `CoachCard`, `LoadBalance`, `MetricRing`, `SessionCard`).
- **`src/services/`** — browser-only side effects. Currently just `localStore.ts` (typed `loadLocalValue` / `saveLocalValue` with try/catch fallbacks). New side-effectful code (storage, future fetch) belongs here, not in screens.

The flow is: `demoData` → `App.tsx` applies domain transforms (e.g. `protectRunsAfterHeavyLowerBody`) → resulting view models passed as props into screens. Persisted state goes through `services/localStore` keyed by string (e.g. `'hybrid-coach-active-screen'`).

### Styling

Single global stylesheet at `src/styles.css` imported once by `main.tsx`. No CSS modules, no CSS-in-JS. Icons come from `lucide-react`.

## Hard constraints (do not violate)

- **No API keys, tokens, or real credentials anywhere in the repo.** `scripts/check-no-secrets.mjs` blocks the patterns `sk-…`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OCR_API_KEY`, `VITE_*_SECRET`, `VITE_*_API_KEY`. This runs in `verify` and CI — do not weaken the patterns to make a commit pass; remove the secret instead.
- **No real private training data.** The README is explicit: future OCR, AI extraction, auth, and synced storage must run through a secure backend — this repo is the static frontend only.
- **GitHub Pages base path.** `vite.config.ts` sets `base: './'` when `GITHUB_PAGES=true`, otherwise `'/'`. Don't hardcode absolute asset paths.
- **`build` runs `tsc --noEmit` first.** Type errors fail the build; `noEmit: true` in `tsconfig.json` means TS never emits — Vite handles transpilation. Strict mode is on.

## Conventions worth knowing

- React 19 + the new JSX transform (`"jsx": "react-jsx"`) — no `import React from 'react'` needed.
- `moduleResolution: "Bundler"` — extensionless relative imports are fine.
- Named exports for components (`export function ScreenX`), default export only for `App`.
- Domain functions return new objects (see `protectRunsAfterHeavyLowerBody` spreading `...plan` / `...session`) — preserve this immutability when extending planning logic.

## Handoff protocol (from AGENTS.md)

When the user asks for "handoff", "checkpoint", "fresh context", or "continue in new thread", produce a concise handoff summary with: goal, current findings, decisions made, files changed or inspected, commands/tests run and results, remaining work, important constraints, and a suggested next prompt for the new thread. Keep it short and implementation-focused.

## Deploy

`.github/workflows/deploy-pages.yml` builds with `GITHUB_PAGES=true` and publishes to GitHub Pages. Pages must be enabled for GitHub Actions in repo settings (one-time, manual).
