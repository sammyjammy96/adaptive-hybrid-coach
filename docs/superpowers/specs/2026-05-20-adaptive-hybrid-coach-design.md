# Adaptive Hybrid Coach Design

Date: 2026-05-20

## Summary

Build a mobile-first web app for an athlete who follows CrossFit gym programming and wants running to improve alongside it. The app acts as an adaptive hybrid coach: it accepts PushPress workout screenshots, helps classify the gym programming, builds an editable weekly running plan around CrossFit classes, and suggests conservative adjustments from workout logs and readiness check-ins.

The first deployable version should be a polished frontend prototype that can be hosted on GitHub Pages for mobile preview. It must not expose API keys or store private training data in a way that pretends to be production-secure.

## Goals

- Help the athlete improve running and CrossFit together without overloading recovery.
- Respect the CrossFit gym's existing programming instead of replacing it.
- Convert uploaded PushPress screenshots into reviewed workout context.
- Generate an editable weekly plan that fits runs around CrossFit anchors.
- Use quick logs and readiness check-ins to propose adjustments.
- Feel premium and motivating while avoiding distracting stats or fluff.
- Keep the architecture compatible with a future secure backend and multi-user product.

## Non-Goals

- Nutrition, calorie, macro, or meal tracking.
- Wearable, calendar, or PushPress account integrations.
- Public SaaS infrastructure in the first version.
- Automatic AI coaching decisions that silently change the user's plan.
- Storing production secrets or private AI credentials in GitHub Pages.
- Replacing the CrossFit gym's programming.

## Target User

The first user is a CrossFit athlete who attends programmed classes through a gym and wants to add structured running without hurting lifting, WOD performance, or recovery. The product should be personal enough to support this workflow quickly, but built cleanly enough that accounts and other athletes can be added later.

## Product Approach

The selected approach is an Adaptive Hybrid Coach.

The app combines planner, logger, and coach companion behavior:

- It collects profile, PRs, running baseline, goals, constraints, and weekly availability.
- It treats CrossFit classes as fixed or semi-fixed anchors.
- It ingests PushPress screenshots and suggests structured tags.
- It places running sessions around the CrossFit load.
- It asks for quick post-workout feedback and readiness signals.
- It recommends adjustments, but asks the athlete to approve changes.

This is intentionally narrower than a full AI coach. The first version should make planning and adaptation feel useful before adding production AI, accounts, or integrations.

## App Structure

Primary navigation:

- Today
- Plan
- Import
- Log
- Profile

### Today

Today is the first screen and the daily command center. It shows only what is needed for the next training decision:

- Next planned session.
- Readiness state.
- One coach recommendation.
- One key risk or opportunity, when relevant.
- Simple action buttons such as log, adjust, or mark complete.

The Today screen should avoid a stats wall. It should answer: "What should I do today, and should I change anything?"

### Plan

Plan shows an editable weekly layout. CrossFit classes are anchors, and runs are positioned around them.

Each session should expose:

- Type: CrossFit, easy run, quality run, long run, rest, recovery.
- Intended intensity.
- Expected duration.
- Main purpose.
- Warning or balance state when relevant.

The athlete can edit the plan by changing days, shortening sessions, swapping run types, marking rest days, and approving or rejecting coach adjustments.

### Import

Import handles PushPress screenshot uploads.

The import flow:

1. Upload one or more screenshots.
2. Extract workout text when AI/OCR is available, or display a manual entry fallback.
3. Suggest training tags.
4. Show confidence and needs-review states.
5. Let the athlete correct the interpretation.
6. Approve the workout impact before it affects planning.

Suggested tags include:

- Strength bias.
- Metcon intensity.
- Lower-body load.
- Upper-body load.
- Skill or gymnastics load.
- Estimated duration.
- Estimated fatigue impact.
- Interference risk for running.

Screenshot extraction can be wrong, so reviewed approval is required.

### Log

Log captures the minimum useful training feedback:

- Completed, modified, skipped, or moved.
- RPE.
- Duration.
- Optional run pace or heart rate.
- Notes.
- Soreness.
- Energy.
- Sleep quality.
- Mood.
- Injury or pain flags.

The logging flow should be fast enough to complete after a hard session on mobile.

### Profile

Profile contains:

- Age, height, and basic athlete details.
- Training history.
- Injury flags and constraints.
- Lifting PRs.
- Running baseline.
- CrossFit priorities.
- Current running goal.
- Weekly availability.
- Session length limits.
- Preferred units.
- Privacy and data mode settings.

Body metrics and nutrition are out of scope for v1.

## Visual And UX Direction

The app should feel like a high-end athlete cockpit: polished, tactile, and motivating, without becoming noisy.

Principles:

- Mobile-first layout with a bottom navigation pattern.
- Dense but calm information hierarchy.
- Premium surfaces with subtle depth, crisp borders, compact panels, strong typography, and smooth state changes.
- Fitness-specific indicators only when they help decisions.
- No marketing-style landing page as the first screen.
- No decorative fluff or unnecessary statistics.

Allowed high-signal visual elements:

- Readiness ring.
- Weekly load balance bar.
- Session intensity chips.
- Import confidence state.
- Muscle/load indicators.
- Coach explanation cards.
- Clear warning and recovery states.

Stats should appear only when they inform a decision. Progress views are secondary in v1 and should not become a main navigation item yet.

## Planning Logic

The first version can use deterministic rules and mock coach logic before secure AI is added.

Inputs:

- Athlete profile.
- Goals.
- Weekly availability.
- CrossFit workout tags.
- Running baseline.
- Completed workout logs.
- Readiness check-ins.

Outputs:

- Weekly plan.
- Session purpose.
- Intensity and duration recommendations.
- Warnings for interference risk.
- Proposed adjustments after high fatigue, missed sessions, pain flags, or heavy CrossFit load.

Rules should be conservative:

- Avoid hard running after high lower-body CrossFit load unless explicitly approved.
- Prefer easy running near heavy strength/metcon days.
- Protect at least one recovery day when fatigue or soreness is high.
- Reduce intensity when injury flags appear.
- Explain all adjustments in plain language.

## Data Model

Core entities:

- AthleteProfile
- TrainingGoal
- AvailabilityWindow
- PersonalRecord
- ImportedWorkout
- WorkoutTag
- WeeklyPlan
- PlannedSession
- TrainingLog
- ReadinessCheckIn
- CoachRecommendation

The data model should separate planned sessions from completed logs. Imported screenshots should produce reviewed workout records rather than directly mutating the plan.

## Architecture

V1 frontend:

- Static React/Vite app.
- Deployable to GitHub Pages.
- Responsive and mobile-first.
- Uses local mocked data or local browser storage for prototype state.
- Does not contain private credentials.

Future backend:

- Authentication.
- Secure user data storage.
- OCR and AI extraction.
- AI coaching recommendations.
- Audit trail for plan changes.
- Optional integrations.

GitHub Pages is only for the frontend preview and early prototype. Any production OCR, AI, account, or data-sync behavior must move behind a backend API.

## Security And Privacy

Training logs, readiness notes, pain flags, and screenshots are sensitive personal data. The product should be designed as privacy-first from the beginning.

Requirements:

- No API keys or model credentials in the frontend.
- No hardcoded personal health or training data in committed demo code.
- Clear distinction between local prototype data and synced production data.
- Screenshot imports require user review before data is saved or used.
- Injury and pain flags trigger conservative coaching.
- Future backend endpoints must authenticate users before accessing private data.
- Future screenshot processing should avoid retaining raw images unless the user explicitly opts in.
- Coach recommendations must explain their reasoning and avoid medical diagnosis.

The app can provide training guidance, but it should not present itself as a medical, injury diagnosis, or professional healthcare tool.

## Error Handling

Important states:

- Screenshot unreadable.
- Low-confidence extraction.
- Missing workout fields.
- Conflicting workout tags.
- Plan cannot fit all requested training into availability.
- High fatigue or pain flag detected.
- Local storage unavailable.
- Unsaved edits before leaving a screen.

Behavior:

- Ask for user review on uncertain imports.
- Offer manual entry when extraction fails.
- Prefer conservative recommendations under fatigue or pain.
- Explain conflicts and suggest trade-offs.
- Never silently change the weekly plan.

## Testing Strategy

Frontend tests:

- Navigation and primary screen rendering.
- Profile setup flow.
- Import review states.
- Weekly plan editing.
- Logging flow.
- Recommendation approval and rejection.
- Local persistence.

Planning tests:

- Heavy lower-body CrossFit affects run placement.
- High fatigue reduces upcoming intensity.
- Injury flags trigger conservative suggestions.
- Fixed availability constraints are respected.
- Missed sessions produce reasonable adjustments.

UX verification:

- Mobile viewport checks.
- Text does not overlap or overflow.
- Controls are usable with touch.
- The Today screen remains focused and not stat-heavy.

Security checks:

- No secrets in frontend code.
- No production API calls from GitHub Pages without a backend.
- Demo data is fake and clearly non-private.

## Delivery Plan Direction

After this design is approved, the next step is an implementation plan.

The likely implementation path:

1. Scaffold a Vite React app.
2. Configure GitHub Pages deployment.
3. Build the app shell and navigation.
4. Add mocked domain data.
5. Build Today, Plan, Import, Log, and Profile screens.
6. Add planning and recommendation rules.
7. Add local persistence.
8. Verify mobile layout and GitHub Pages preview.

Implementation must wait until this design spec is reviewed and approved.
