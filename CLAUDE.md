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

`src/main.tsx` mounts `<App />`. `src/App.tsx` owns a single `useReducer(appReducer, undefined, loadAppState)` that drives every screen. The reducer lives in `src/domain/appState.ts` (pure, no side effects); persistence is in `src/services/appPersistence.ts` (writes to localStorage on every dispatch via a `useEffect`). Routing is just a `state.activeScreen` check that picks one of five screen components inside `components/AppChrome`. `AppChrome` renders both a side nav (desktop) and a bottom nav (mobile) from the same `navItems` list. There is no router library — adding a screen means: extend `ScreenKey` in `domain/appState.ts`, add to `navItems` in `AppChrome.tsx`, add a branch in `App.tsx`, add the screen file under `src/screens/`.

### Layered structure

- **`src/domain/`** — pure TS, no React. `types.ts` is the canonical schema for every entity (`AthleteProfile`, `WeeklyPlan`, `PlannedSession`, `ImportedWorkout`, `ReadinessCheckIn`, `CoachRecommendation`, etc.). `planning.ts` holds the readiness / weekly-balance / run-protection logic and the canonical `dayOrder` constant. `appState.ts` defines `AppState`, the `AppAction` union, `appReducer`, and helpers (`findNextHardPlannedSession`, `nextEmptyDay`). `planTemplates.ts` holds three `WeeklyPlan` variants for the Regenerate Week feature. `demoData.ts` exports the initial fixtures. **All planning + reducer logic is pure and unit-tested next to the source** — keep new rules pure and add tests there.
- **`src/screens/`** — one component per top-level screen. Receive their data and dispatch callbacks as props from `App.tsx`; do not fetch.
- **`src/components/`** — shared presentational pieces (`AppChrome`, `CoachCard`, `LoadBalance`, `MetricRing`, `SessionCard`).
- **`src/services/`** — browser-only side effects. `localStore.ts` is the typed try/catch wrapper around `window.localStorage`. `appPersistence.ts` layers on top: schema versioning (`hybrid-coach-state-v1`), one-shot migration from the legacy `hybrid-coach-active-screen` key, and `isValidShape` sanity check before trusting a stored payload.

The flow is: `loadAppState()` hydrates from localStorage → `useReducer` holds the state → `App.tsx` derives `protectedPlan` via `protectRunsAfterHeavyLowerBody(state.plan, state.workouts)` → screens get state slices + typed dispatch callbacks. Every dispatch persists via the `useEffect`.

### In-progress work

The interactive-features work (wiring every prototype button to a real behavior) is mid-execution. Tasks 1–4 (state foundation) are complete; Tasks 5–11 (the UI wiring + final verification) remain. **Resume from [`docs/superpowers/plans/2026-05-20-interactive-features.md`](docs/superpowers/plans/2026-05-20-interactive-features.md)** — that file has the status table, the full code for each remaining task, and the underlying spec link.

### Queued follow-up specs (do not implement until interactive-features is done)

Two specs are designed and committed but explicitly gated on the interactive-features plan finishing first:

- **[Smart Planner](docs/superpowers/specs/2026-05-20-smart-planner-design.md)** — replace the 3 hand-written plan variants with a ~20-entry tagged library + rule-based picker that selects based on recent logs, readiness, goal, and availability. Produces a human-readable rationale. Zero cost, no LLM, no backend.
- **[OCR for Imports](docs/superpowers/specs/2026-05-20-ocr-imports-design.md)** — add Tesseract.js so the Upload Screenshot button performs real browser-side OCR, parsed into structured `ImportedWorkout` fields via regex heuristics. No backend, no API key.

Both have implementation plans pending — write the plan only when ready to start. Each spec opens with an "Implementation gate" note pointing back at the interactive-features plan.

### Styling

Single global stylesheet at `src/styles.css` imported once by `main.tsx`. No CSS modules, no CSS-in-JS. Icons come from `lucide-react`.

## Hard constraints (do not violate)

- **No API keys, tokens, or real credentials anywhere in the repo.** `scripts/check-no-secrets.mjs` blocks well-known credential patterns (OpenAI-style `sk-…` keys plus several env-var-name shapes — see the `forbiddenPatterns` array in the script for the canonical list). This runs in `verify` and CI. **Important:** prose in `*.md` files that names those env vars literally will trigger the scanner too (the script ignores `docs/superpowers/` for this reason). Describe what is forbidden rather than spelling the env var names out, or extend the ignore list for new doc paths — never weaken the patterns to make a commit pass.
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

`.github/workflows/deploy-pages.yml` builds with `GITHUB_PAGES=true` and publishes to GitHub Pages on every push to `master`. The live URL is **https://sammyjammy96.github.io/adaptive-hybrid-coach/**. Pages is enabled for GitHub Actions in repo settings (already configured — no further setup needed).
