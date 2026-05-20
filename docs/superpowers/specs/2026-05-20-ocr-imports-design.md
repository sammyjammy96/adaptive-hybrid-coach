# OCR for Imports Design

> **Implementation gate:** Do not implement until `2026-05-20-interactive-features-design.md` is fully shipped (Tasks 5–11 of [`2026-05-20-interactive-features.md`](../plans/2026-05-20-interactive-features.md)). This spec upgrades the Upload Screenshot flow from Task 8.

**Goal:** Make the Upload Screenshot button do something genuinely useful — extract text from the selected image with browser-side OCR (Tesseract.js), parse the text into structured `ImportedWorkout` fields via heuristics, and create a `needs-review` workout the user can refine. No backend, no API key, no per-call cost.

**Date:** 2026-05-20
**Related:** `2026-05-20-interactive-features-design.md` (the canned-workout stub this replaces lives in Task 8 of that plan).

---

## Why Tesseract.js, not a real model

The static-frontend constraint blocks cloud OCR. Tesseract.js is mature, MIT-licensed, runs entirely in the browser via WebAssembly, and is good enough for clean printed text — which is what PushPress screenshots are. It's the only OCR option that respects the no-backend rule and doesn't depend on a fragile free API tier.

Quality won't match GPT-4 Vision or Claude's vision API, but for the prototype's domain (extracting workout titles and a few lift names from a screenshot), it's adequate. Users always see results in `needs-review` state and can edit before approval — OCR errors are recoverable.

---

## Scope

**In scope**
- Add `tesseract.js@^5` as a runtime dependency.
- New `src/services/ocrImport.ts` that wraps a Tesseract worker and exposes a single async function.
- New `src/domain/workoutParser.ts` — pure TypeScript heuristics that map extracted text → `ImportedWorkout` fields.
- Update `ImportScreen` to show a loading state during OCR, then create the workout via dispatch.
- Update the reducer's `ADD_UPLOADED_WORKOUT` action (or add a sibling `ADD_PARSED_WORKOUT` action) so it accepts the parsed fields instead of generating canned ones.
- Tests for the parser (the OCR service is mocked in tests).

**Out of scope (explicit non-goals)**
- Image preprocessing (rotation, crop, contrast). User is expected to upload reasonably-oriented screenshots.
- Multi-language OCR (English only).
- Custom Tesseract model training.
- Real-time camera preview parsing.
- Server-side OCR.

---

## Architecture

### OCR service

```ts
// src/services/ocrImport.ts

export interface OcrResult {
  text: string;
  /** Tesseract's average word confidence, 0–100. */
  confidence: number;
}

export async function extractTextFromImage(file: File): Promise<OcrResult>;
```

Implementation notes:
- Lazy-initialize a single Tesseract worker on first call (creating workers is expensive). Reuse it across uploads.
- The worker loads the English language data (~10MB) on first use and caches it via the browser. Subsequent calls reuse the cached data.
- Reject files larger than 5MB before passing to Tesseract — prevents the worker from hanging on huge images.
- The worker should be terminated when the page unloads (best-effort `beforeunload` handler), but the v1 implementation can skip this and let the GC handle it.

### Parser

```ts
// src/domain/workoutParser.ts

export interface ParsedWorkout {
  day: string;
  title: string;
  extractedText: string;            // the full OCR output, trimmed
  confidence: number;               // 0–1 (Tesseract's 0–100 divided by 100)
  lowerBodyLoad: Intensity;
  metconIntensity: Intensity;
  fatigueImpact: Intensity;
  tags: WorkoutTag[];
}

export function parseWorkoutText(text: string, options?: { confidence?: number; dayHint?: string }): ParsedWorkout;
```

Heuristics (deterministic, regex-driven):

| Field | Heuristic |
|---|---|
| `day` | First match of `/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i`. Else `dayHint`. Else fallback `'Thu'`. |
| `title` | First non-numeric, non-empty line, capped at 60 chars. Else `'Imported workout'`. |
| `extractedText` | Full OCR output, trimmed, capped at 500 chars. |
| `lowerBodyLoad` | `'high'` if text matches `/squat|deadlift|clean|snatch|lunge|box jump|wall ball/i`; `'moderate'` if `/running|run|row|bike/i`; else `'low'`. |
| `metconIntensity` | `'high'` if `/AMRAP|EMOM|HIIT|sprint|for time/i`; `'moderate'` if `/intervals|tempo|threshold/i`; else `'low'`. |
| `fatigueImpact` | Average of `lowerBodyLoad` and `metconIntensity` (encoded as 0/1/2, averaged, rounded). |
| `tags` | One tag per keyword cluster matched above (e.g. `{ label: 'lower body', level: 'high' }`, `{ label: 'metcon', level: 'high' }`). At most 4 tags. |

Parser is pure (no async, no I/O). All heuristics are testable with synthetic input strings.

### ImportScreen changes

The Upload Screenshot button gains a loading state. Local component state (`'idle' | 'processing' | 'error'`) — does NOT go into `AppState`. The async OCR work is screen-local.

On file select:
1. Set local state to `'processing'`.
2. Call `extractTextFromImage(file)`.
3. On success: pass `result` through `parseWorkoutText`, then dispatch the new action with the parsed fields.
4. On error: set local state to `'error'`, show a one-line error, still create a `needs-review` workout using the canned-fallback fields (matches the current Task 8 behavior).
5. Set local state back to `'idle'`.

The button shows a spinner during `'processing'`. The error state shows a small inline message that auto-clears after 5 seconds or on next upload.

### Reducer change

Option A (simpler): Replace the existing `ADD_UPLOADED_WORKOUT { fileName }` action with `ADD_UPLOADED_WORKOUT { fileName: string; parsed?: ParsedWorkout }`. If `parsed` is provided, the reducer uses its fields; if not (error fallback), it uses the canned defaults. Backward-compatible.

Option B (cleaner separation): Keep the existing action as the canned-fallback path, add a new action `ADD_PARSED_WORKOUT { parsed: ParsedWorkout }` for the success path. Two action names, slightly more code.

Pick Option A during implementation — simpler and the fallback path is exactly what the existing action does.

---

## Testing

### workoutParser
- Snapshot-style tests with sample text inputs covering: clean barbell session text, AMRAP metcon, mixed metcon + barbell, running interval session, garbled OCR output (low-confidence fallback case).
- Each test asserts the specific expected `day`, `title`, `lowerBodyLoad`, `metconIntensity`, `tags` for that input.
- Edge cases: empty string, single character, all-numeric input, text with no day-of-week markers.

### ocrImport service
- The Tesseract worker is mocked. Test that `extractTextFromImage` rejects files > 5MB before invoking the worker.
- Test that the same `File` handed in twice reuses the worker (assertion on mock invocation count).
- No real OCR runs in unit tests — that's a runtime concern, not a unit-test concern.

### App-level integration test
- Mock the `ocrImport` service.
- Upload a fake `File`, assert the loading state appears, then the new workout appears in the Import list with parsed fields (not the canned defaults).

---

## Error handling

| Condition | UI behavior | State outcome |
|---|---|---|
| File > 5MB | Inline error: "Image too large (5MB max)" | No workout created |
| Tesseract throws (corrupted image, etc.) | Inline error: "Couldn't read this image clearly — saved as needs-review" | Canned-fallback workout created |
| Confidence < 0.4 | Inline note: "Low confidence on text — review carefully" | Parsed workout created, still `needs-review` |
| Parser returns empty title | `title` falls back to `'Imported workout'` | Workout created with fallback title |

---

## Bundle size

Tesseract.js core is ~3MB minified, plus ~10MB of English language data (downloaded on first OCR call, not at page load). The 3MB core load happens on first render of the Import screen — acceptable for this app. To reduce initial bundle, the import can be lazy:

```ts
const { extractTextFromImage } = await import('../services/ocrImport');
```

…called from `ImportScreen`'s file-change handler, not at module load. This keeps the Today/Plan/Log/Profile screens free of the Tesseract weight.

---

## Open questions (to resolve during implementation, not blockers)

- Should we cache parsed results per file hash so re-uploading the same file is instant? Probably not worth the complexity for a personal prototype.
- Should the worker be terminated explicitly on tab close? Best-effort `beforeunload` is fine; not critical.
- Should the parser support multi-workout images (e.g. a whole week visible at once)? No — out of scope, one workout per upload.

---

## Risks

- **Tesseract quality on real PushPress screenshots is unverified.** Plan to test with 5–10 real screenshots before tuning the parser heuristics. The parser regex set will need adjustment based on what PushPress actually produces.
- **First OCR is slow.** Tesseract has to download language data on first call (~10MB, cached after). Subsequent calls are 2–5 seconds. The loading state must communicate "this is normal" — consider a longer-than-usual spinner with copy like "Reading image…".
- **Bundle size delta is meaningful.** Even with lazy loading, the Import screen becomes much heavier than the others. Worth measuring with `vite build --report` (or similar) once integrated.

---

## Non-goals reaffirmed

- No backend, no API keys.
- No image preprocessing.
- No multi-language OCR.
- No multi-workout-per-image parsing.
- No accuracy guarantees — outputs always land in `needs-review`.
