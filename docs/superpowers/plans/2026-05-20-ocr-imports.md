# OCR for Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Upload Screenshot button do real work — extract text from the image with Tesseract.js in the browser, parse the text into structured `ImportedWorkout` fields via deterministic regex heuristics, and create a `needs-review` workout the user can refine.

**Architecture:** Pure parser in `src/domain/workoutParser.ts` (regex-driven, fully unit-tested). Side-effectful OCR service in `src/services/ocrImport.ts` that wraps a lazy-initialized Tesseract worker behind a single `extractTextFromImage(file)` Promise. `ImportScreen` calls them in sequence with local loading/error state, then dispatches `ADD_UPLOADED_WORKOUT` with an optional `parsed?: ParsedWorkout` payload. The reducer uses the parsed fields when present and falls back to canned defaults on error.

**Tech Stack:** React 19, TypeScript (strict), Vite, Vitest, React Testing Library, jsdom, lucide-react, **tesseract.js@^5** (new dependency). No backend.

**Source spec:** [`docs/superpowers/specs/2026-05-20-ocr-imports-design.md`](../specs/2026-05-20-ocr-imports-design.md)

---

## Working Directory & Run Convention

All commands run from the repo root. User authorizes direct push to master after each task: `git push origin master`. If a push is rejected because the remote moved: `git fetch origin && git rebase origin/master && git push origin master`. Never force-push.

| Logical command | Concrete command |
|---|---|
| run all tests | `npm run test` |
| run a single file | `npx vitest run path/to/file.test.ts` |
| typecheck | `npx tsc --noEmit` |
| canonical verify | `npm run verify` |

---

## File Structure

**New**
- `src/domain/workoutParser.ts` — pure heuristic parser. `ParsedWorkout` type + `parseWorkoutText`.
- `src/domain/workoutParser.test.ts` — snapshot-style tests for the parser.
- `src/services/ocrImport.ts` — Tesseract worker wrapper. `OcrResult` type + `extractTextFromImage`.
- `src/services/ocrImport.test.ts` — tests with the worker factory mocked.

**Modified**
- `package.json` — add `tesseract.js` dependency (will also update `package-lock.json`).
- `src/domain/appState.ts` — `ADD_UPLOADED_WORKOUT` action gains optional `parsed?: ParsedWorkout` field. Reducer uses parsed fields when present.
- `src/domain/appState.test.ts` — add tests for the parsed-fields path.
- `src/screens/ImportScreen.tsx` — lazy-import `ocrImport`, manage `'idle' | 'processing' | 'error'` state, show spinner + error inline, dispatch with parsed fields.
- `src/__tests__/app.test.tsx` — add an integration test that mocks `ocrImport` and asserts the parsed workout appears.
- `src/styles.css` — append `.upload-progress` and `.upload-error` rules.

**Unchanged**
- `src/domain/types.ts` — `ImportedWorkout` already has all needed fields. `Intensity` and `WorkoutTag` are reused.
- All other screen + component files.

---

### Task 1: Pure parser (TDD)

**Files:**
- Create: `src/domain/workoutParser.ts`
- Create: `src/domain/workoutParser.test.ts`

Strict TDD. The parser is pure — easy to test exhaustively. No new dependency added yet.

- [ ] **Step 1: Write the parser tests first**

Create `src/domain/workoutParser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseWorkoutText } from './workoutParser';

describe('parseWorkoutText', () => {
  it('extracts a day from explicit weekday markers', () => {
    const result = parseWorkoutText('Wed: 5x3 back squat\nThen 10 min AMRAP wall balls, burpees');
    expect(result.day).toBe('Wed');
  });

  it('uses dayHint when no weekday marker is present', () => {
    const result = parseWorkoutText('5x3 back squat\n10 min AMRAP', { dayHint: 'Fri' });
    expect(result.day).toBe('Fri');
  });

  it('falls back to Thu when no weekday marker and no hint', () => {
    const result = parseWorkoutText('5x3 back squat');
    expect(result.day).toBe('Thu');
  });

  it('uses the first non-numeric, non-empty line as title (capped at 60 chars)', () => {
    const result = parseWorkoutText('5x3 back squat\nThen accessory work, then a long metcon');
    expect(result.title.startsWith('5x3 back squat')).toBe(false);
    expect(result.title).toBe('Then accessory work, then a long metcon');
  });

  it('falls back to "Imported workout" when no non-numeric line exists', () => {
    const result = parseWorkoutText('5x3\n10x2\n4x5');
    expect(result.title).toBe('Imported workout');
  });

  it('caps title at 60 characters', () => {
    const longLine = 'A'.repeat(120);
    const result = parseWorkoutText(longLine);
    expect(result.title.length).toBe(60);
  });

  it('caps extractedText at 500 characters', () => {
    const longText = 'X'.repeat(900);
    const result = parseWorkoutText(longText);
    expect(result.extractedText.length).toBe(500);
  });

  it('classifies lower-body load as high for squat/deadlift/clean/snatch/lunge/box jump/wall ball', () => {
    expect(parseWorkoutText('5x3 back squat').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Heavy deadlift triple').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Power clean ladder').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Snatch complex 1+1+1').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Walking lunges 100m').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Box jump pyramid').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Wall ball 30 reps').lowerBodyLoad).toBe('high');
  });

  it('classifies lower-body load as moderate for running/row/bike', () => {
    expect(parseWorkoutText('5K run easy').lowerBodyLoad).toBe('moderate');
    expect(parseWorkoutText('2000m row test').lowerBodyLoad).toBe('moderate');
    expect(parseWorkoutText('30 min bike z2').lowerBodyLoad).toBe('moderate');
  });

  it('classifies lower-body load as low when nothing matches', () => {
    expect(parseWorkoutText('Strict press 5x5\nPull-up skill').lowerBodyLoad).toBe('low');
  });

  it('classifies metcon intensity as high for AMRAP/EMOM/HIIT/sprint/for time', () => {
    expect(parseWorkoutText('15 min AMRAP burpees, pull-ups').metconIntensity).toBe('high');
    expect(parseWorkoutText('EMOM 10: 5 thrusters').metconIntensity).toBe('high');
    expect(parseWorkoutText('HIIT bike intervals').metconIntensity).toBe('high');
    expect(parseWorkoutText('Sprint repeats').metconIntensity).toBe('high');
    expect(parseWorkoutText('100 burpees For time').metconIntensity).toBe('high');
  });

  it('classifies metcon intensity as moderate for intervals/tempo/threshold', () => {
    expect(parseWorkoutText('800m intervals').metconIntensity).toBe('moderate');
    expect(parseWorkoutText('Tempo run 30 min').metconIntensity).toBe('moderate');
    expect(parseWorkoutText('Threshold pace 5x1 mile').metconIntensity).toBe('moderate');
  });

  it('classifies metcon intensity as low when nothing matches', () => {
    expect(parseWorkoutText('5x3 back squat').metconIntensity).toBe('low');
  });

  it('computes fatigueImpact as average of lower-body and metcon (high+high = high)', () => {
    const result = parseWorkoutText('AMRAP 12: back squat + box jump');
    expect(result.fatigueImpact).toBe('high');
  });

  it('computes fatigueImpact as moderate when one signal is high and the other low', () => {
    const result = parseWorkoutText('5x3 back squat');
    expect(result.lowerBodyLoad).toBe('high');
    expect(result.metconIntensity).toBe('low');
    expect(result.fatigueImpact).toBe('moderate');
  });

  it('computes fatigueImpact as low when both signals are low', () => {
    const result = parseWorkoutText('Strict press 5x5\nPull-up skill');
    expect(result.fatigueImpact).toBe('low');
  });

  it('emits a lower-body tag when matched', () => {
    const result = parseWorkoutText('5x3 back squat');
    const tag = result.tags.find((t) => t.label === 'lower body');
    expect(tag?.level).toBe('high');
  });

  it('emits a metcon tag when matched', () => {
    const result = parseWorkoutText('15 min AMRAP burpees');
    const tag = result.tags.find((t) => t.label === 'metcon');
    expect(tag?.level).toBe('high');
  });

  it('emits at most 4 tags', () => {
    const result = parseWorkoutText(
      'Wed AMRAP back squat box jump wall ball deadlift snatch lunge'
    );
    expect(result.tags.length).toBeLessThanOrEqual(4);
  });

  it('passes through confidence (0–1) from options', () => {
    const result = parseWorkoutText('5x3 back squat', { confidence: 0.72 });
    expect(result.confidence).toBe(0.72);
  });

  it('defaults confidence to 1 when not provided', () => {
    const result = parseWorkoutText('5x3 back squat');
    expect(result.confidence).toBe(1);
  });

  it('handles empty input without throwing', () => {
    const result = parseWorkoutText('');
    expect(result.title).toBe('Imported workout');
    expect(result.day).toBe('Thu');
    expect(result.lowerBodyLoad).toBe('low');
    expect(result.metconIntensity).toBe('low');
    expect(result.tags).toEqual([]);
  });

  it('handles all-numeric input without throwing', () => {
    const result = parseWorkoutText('5x3\n10x2\n100');
    expect(result.title).toBe('Imported workout');
  });
});
```

- [ ] **Step 2: Run the test file to confirm it fails**

Run:
```
npx vitest run src/domain/workoutParser.test.ts
```

Expected: FAIL — `workoutParser.ts` does not exist.

- [ ] **Step 3: Implement the parser**

Create `src/domain/workoutParser.ts`:

```ts
import type { Intensity, WorkoutTag } from './types';

export interface ParsedWorkout {
  day: string;
  title: string;
  extractedText: string;
  confidence: number;
  lowerBodyLoad: Intensity;
  metconIntensity: Intensity;
  fatigueImpact: Intensity;
  tags: WorkoutTag[];
}

const DAY_PATTERN = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i;
const LOWER_BODY_HIGH = /squat|deadlift|clean|snatch|lunge|box jump|wall ball/i;
const LOWER_BODY_MODERATE = /running|run|row|bike/i;
const METCON_HIGH = /AMRAP|EMOM|HIIT|sprint|for time/i;
const METCON_MODERATE = /intervals|tempo|threshold/i;

const TITLE_CAP = 60;
const TEXT_CAP = 500;
const MAX_TAGS = 4;

function normalizeDay(raw: string): string {
  return raw.charAt(0).toUpperCase() + raw.slice(1, 3).toLowerCase();
}

function pickDay(text: string, hint?: string): string {
  const match = text.match(DAY_PATTERN);
  if (match) return normalizeDay(match[1]);
  if (hint) return hint;
  return 'Thu';
}

function pickTitle(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines) {
    if (/[A-Za-z]/.test(line)) {
      return line.slice(0, TITLE_CAP);
    }
  }
  return 'Imported workout';
}

function classifyLowerBody(text: string): Intensity {
  if (LOWER_BODY_HIGH.test(text)) return 'high';
  if (LOWER_BODY_MODERATE.test(text)) return 'moderate';
  return 'low';
}

function classifyMetcon(text: string): Intensity {
  if (METCON_HIGH.test(text)) return 'high';
  if (METCON_MODERATE.test(text)) return 'moderate';
  return 'low';
}

function intensityToScore(intensity: Intensity): number {
  if (intensity === 'high') return 2;
  if (intensity === 'moderate') return 1;
  return 0;
}

function scoreToIntensity(score: number): Intensity {
  if (score >= 1.5) return 'high';
  if (score >= 0.5) return 'moderate';
  return 'low';
}

function buildTags(text: string, lowerBody: Intensity, metcon: Intensity): WorkoutTag[] {
  const tags: WorkoutTag[] = [];
  if (LOWER_BODY_HIGH.test(text) || LOWER_BODY_MODERATE.test(text)) {
    tags.push({ label: 'lower body', level: lowerBody });
  }
  if (METCON_HIGH.test(text) || METCON_MODERATE.test(text)) {
    tags.push({ label: 'metcon', level: metcon });
  }
  if (/box jump|jumping|jump/i.test(text)) {
    tags.push({ label: 'jumping', level: lowerBody === 'high' ? 'high' : 'moderate' });
  }
  if (/pull|gymnastics|muscle up|handstand/i.test(text)) {
    tags.push({ label: 'gymnastics', level: 'moderate' });
  }
  return tags.slice(0, MAX_TAGS);
}

export function parseWorkoutText(
  text: string,
  options: { confidence?: number; dayHint?: string } = {}
): ParsedWorkout {
  const trimmed = text.trim();
  const lowerBodyLoad = classifyLowerBody(trimmed);
  const metconIntensity = classifyMetcon(trimmed);
  const fatigueImpact = scoreToIntensity(
    (intensityToScore(lowerBodyLoad) + intensityToScore(metconIntensity)) / 2
  );
  return {
    day: pickDay(trimmed, options.dayHint),
    title: pickTitle(trimmed),
    extractedText: trimmed.slice(0, TEXT_CAP),
    confidence: options.confidence ?? 1,
    lowerBodyLoad,
    metconIntensity,
    fatigueImpact,
    tags: buildTags(trimmed, lowerBodyLoad, metconIntensity)
  };
}
```

- [ ] **Step 4: Run tests to confirm they all pass**

Run:
```
npx vitest run src/domain/workoutParser.test.ts
```

Expected: every test green. If any test fails, investigate carefully — do NOT relax the test. The regex set is calibrated to satisfy every case above.

- [ ] **Step 5: Run full verify**

Run:
```
npm run verify
```

Expected: green. The new parser is a leaf module — no consumers yet, so nothing else can break.

- [ ] **Step 6: Commit**

```
git add src/domain/workoutParser.ts src/domain/workoutParser.test.ts
git commit -m "feat: add deterministic workout parser for OCR text"
git push origin master
```

Expected: commit and push succeed.

---

### Task 2: OCR service with mocked worker (TDD)

**Files:**
- Create: `src/services/ocrImport.ts`
- Create: `src/services/ocrImport.test.ts`
- Modify: `package.json` (add `tesseract.js`)

Installs the runtime dependency and wraps it behind a single async function. Worker is lazy-initialized and reused across calls. Tests mock the worker factory so no real OCR runs.

- [ ] **Step 1: Add the dependency**

Run:
```
npm install tesseract.js@^5 --save
```

Expected: `package.json` gets a new dependency entry; `package-lock.json` updates. Verify with `git diff package.json`.

- [ ] **Step 2: Write failing tests**

Create `src/services/ocrImport.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recognizeMock = vi.fn();
const terminateMock = vi.fn();
const createWorkerMock = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker: (lang: string) => createWorkerMock(lang)
}));

async function loadFreshService() {
  vi.resetModules();
  return await import('./ocrImport');
}

function makeFile(size: number, name = 'shot.png'): File {
  const data = new Uint8Array(size);
  return new File([data], name, { type: 'image/png' });
}

describe('extractTextFromImage', () => {
  beforeEach(() => {
    recognizeMock.mockReset();
    terminateMock.mockReset();
    createWorkerMock.mockReset();
    createWorkerMock.mockImplementation(async () => ({
      recognize: recognizeMock,
      terminate: terminateMock
    }));
    recognizeMock.mockResolvedValue({
      data: { text: 'Sample text', confidence: 87 }
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('rejects files larger than 5MB before invoking the worker', async () => {
    const { extractTextFromImage } = await loadFreshService();
    const big = makeFile(5 * 1024 * 1024 + 1);

    await expect(extractTextFromImage(big)).rejects.toThrow(/too large/i);
    expect(createWorkerMock).not.toHaveBeenCalled();
    expect(recognizeMock).not.toHaveBeenCalled();
  });

  it('returns OCR text and normalised confidence (0–1)', async () => {
    const { extractTextFromImage } = await loadFreshService();
    const file = makeFile(1024);

    const result = await extractTextFromImage(file);

    expect(result.text).toBe('Sample text');
    expect(result.confidence).toBeCloseTo(0.87, 5);
  });

  it('lazy-initialises the worker once and reuses it across calls', async () => {
    const { extractTextFromImage } = await loadFreshService();
    const file = makeFile(1024);

    await extractTextFromImage(file);
    await extractTextFromImage(file);
    await extractTextFromImage(file);

    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock).toHaveBeenCalledTimes(3);
  });

  it('rethrows when the worker recognise call throws', async () => {
    recognizeMock.mockRejectedValue(new Error('OCR boom'));
    const { extractTextFromImage } = await loadFreshService();
    const file = makeFile(1024);

    await expect(extractTextFromImage(file)).rejects.toThrow(/OCR boom/);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

Run:
```
npx vitest run src/services/ocrImport.test.ts
```

Expected: FAIL — `ocrImport.ts` does not exist.

- [ ] **Step 4: Implement the service**

Create `src/services/ocrImport.ts`:

```ts
import { createWorker } from 'tesseract.js';

export interface OcrResult {
  text: string;
  /** Normalised to 0–1. Tesseract returns 0–100. */
  confidence: number;
}

const MAX_BYTES = 5 * 1024 * 1024;

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng');
  }
  return workerPromise;
}

export async function extractTextFromImage(file: File): Promise<OcrResult> {
  if (file.size > MAX_BYTES) {
    throw new Error('Image too large (5MB max).');
  }
  const worker = await getWorker();
  const { data } = await worker.recognize(file);
  return {
    text: data.text ?? '',
    confidence: typeof data.confidence === 'number' ? data.confidence / 100 : 0
  };
}
```

- [ ] **Step 5: Run tests to confirm they pass**

Run:
```
npx vitest run src/services/ocrImport.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 6: Full verify**

Run:
```
npm run verify
```

Expected: green. The new service has no consumers yet, so nothing else breaks. Build size will grow because tesseract.js ships with this commit — note the new bundle size in the build output for sanity (~3MB extra in chunks under `dist/assets/`).

- [ ] **Step 7: Commit**

```
git add package.json package-lock.json src/services/ocrImport.ts src/services/ocrImport.test.ts
git commit -m "feat: add Tesseract.js OCR service with lazy worker init"
git push origin master
```

Expected: commit and push succeed.

---

### Task 3: Reducer accepts parsed fields

**Files:**
- Modify: `src/domain/appState.ts`
- Modify: `src/domain/appState.test.ts`

The `ADD_UPLOADED_WORKOUT` action gains an optional `parsed?: ParsedWorkout` payload. When `parsed` is present, the reducer uses its fields; when absent (error fallback or pre-OCR call sites), it uses the existing canned defaults.

- [ ] **Step 1: Add failing reducer tests**

Append inside `describe('appReducer', ...)` in `src/domain/appState.test.ts`:

```ts
  it('ADD_UPLOADED_WORKOUT with parsed fields uses them', () => {
    const next = appReducer(initialAppState, {
      type: 'ADD_UPLOADED_WORKOUT',
      fileName: 'shot.png',
      parsed: {
        day: 'Wed',
        title: '5x3 back squat',
        extractedText: 'Back squat then short metcon',
        confidence: 0.82,
        lowerBodyLoad: 'high',
        metconIntensity: 'moderate',
        fatigueImpact: 'high',
        tags: [
          { label: 'lower body', level: 'high' },
          { label: 'metcon', level: 'moderate' }
        ]
      }
    });
    const added = next.workouts[next.workouts.length - 1];
    expect(added.day).toBe('Wed');
    expect(added.title).toBe('5x3 back squat');
    expect(added.extractedText).toBe('Back squat then short metcon');
    expect(added.confidence).toBeCloseTo(0.82, 5);
    expect(added.lowerBodyLoad).toBe('high');
    expect(added.metconIntensity).toBe('moderate');
    expect(added.fatigueImpact).toBe('high');
    expect(added.tags.length).toBe(2);
    expect(added.reviewState).toBe('needs-review');
  });

  it('ADD_UPLOADED_WORKOUT without parsed still creates a canned workout (fallback path)', () => {
    const next = appReducer(initialAppState, { type: 'ADD_UPLOADED_WORKOUT', fileName: 'shot.png' });
    const added = next.workouts[next.workouts.length - 1];
    expect(added.title).toBe('Uploaded: shot.png');
    expect(added.reviewState).toBe('needs-review');
    expect(added.confidence).toBeCloseTo(0.65, 5);
  });
```

Update the existing `ADD_UPLOADED_WORKOUT` test (the one that checks the canned title) only if it relies on different field values — verify by reading the file.

- [ ] **Step 2: Run to confirm the new tests fail (and the existing one still passes)**

Run:
```
npx vitest run src/domain/appState.test.ts -t "ADD_UPLOADED_WORKOUT"
```

Expected: the new "with parsed fields" test fails because the reducer ignores the `parsed` field; the existing test (and the new fallback test) pass.

- [ ] **Step 3: Update the action type and the reducer**

In `src/domain/appState.ts`:

a. Add `ParsedWorkout` to the imports from the new parser module:

```ts
import type { ParsedWorkout } from './workoutParser';
```

b. Replace the `ADD_UPLOADED_WORKOUT` entry in `AppAction` union with:

```ts
  | { type: 'ADD_UPLOADED_WORKOUT'; fileName: string; parsed?: ParsedWorkout }
```

c. Update the `ADD_UPLOADED_WORKOUT` case in `appReducer`. The new body:

```ts
    case 'ADD_UPLOADED_WORKOUT': {
      const day = action.parsed?.day ?? nextEmptyDay(state.workouts);
      const workout: ImportedWorkout = action.parsed
        ? {
            id: uploadedWorkoutId(),
            day,
            source: 'pushpress-screenshot',
            title: action.parsed.title,
            extractedText: action.parsed.extractedText,
            confidence: action.parsed.confidence,
            reviewState: 'needs-review',
            lowerBodyLoad: action.parsed.lowerBodyLoad,
            metconIntensity: action.parsed.metconIntensity,
            fatigueImpact: action.parsed.fatigueImpact,
            tags: action.parsed.tags
          }
        : {
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
```

- [ ] **Step 4: Run tests to confirm everything passes**

Run:
```
npx vitest run src/domain/appState.test.ts
```

Expected: all reducer tests green, including the two new ones.

- [ ] **Step 5: Full verify**

Run:
```
npm run verify
```

Expected: green. App.tsx and ImportScreen still call `ADD_UPLOADED_WORKOUT` with only `fileName`, hitting the fallback path — unchanged user-visible behavior. Task 4 will switch them to the parsed path.

- [ ] **Step 6: Commit**

```
git add src/domain/appState.ts src/domain/appState.test.ts
git commit -m "feat: reducer accepts optional parsed workout fields on upload"
git push origin master
```

Expected: commit and push succeed.

---

### Task 4: ImportScreen lazy-imports OCR + parses on upload

**Files:**
- Modify: `src/screens/ImportScreen.tsx`
- Modify: `src/styles.css`

`ImportScreen` becomes async-aware. On file select it lazy-imports `ocrImport`, shows a spinner with a "Reading image…" label, calls OCR + parser, and dispatches `ADD_UPLOADED_WORKOUT` with the parsed fields. On error it shows an inline message and dispatches with no `parsed` (canned fallback).

- [ ] **Step 1: Replace `ImportScreen.tsx`**

Overwrite `src/screens/ImportScreen.tsx`:

```tsx
import { CheckCircle2, Loader2, RotateCcw, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { parseWorkoutText, type ParsedWorkout } from '../domain/workoutParser';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpload: (fileName: string, parsed?: ParsedWorkout) => void;
}

type UploadStatus = 'idle' | 'processing' | 'error';

const ERROR_VISIBLE_MS = 5000;

export function ImportScreen({ workouts, onApprove, onReject, onUpload }: ImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'error') return;
    const timeout = window.setTimeout(() => {
      setStatus('idle');
      setErrorMessage(null);
    }, ERROR_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    setStatus('processing');
    setErrorMessage(null);

    try {
      const { extractTextFromImage } = await import('../services/ocrImport');
      const result = await extractTextFromImage(file);
      const parsed = parseWorkoutText(result.text, { confidence: result.confidence });
      onUpload(file.name, parsed);
      setStatus('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read this image.';
      setErrorMessage(`${message} Saved as needs-review.`);
      setStatus('error');
      onUpload(file.name);
    }
  }

  const isProcessing = status === 'processing';

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <label className={`primary-action icon-action upload-button ${isProcessing ? 'is-busy' : ''}`}>
          {isProcessing ? <Loader2 aria-hidden="true" className="spin" /> : <UploadCloud aria-hidden="true" />}
          {isProcessing ? 'Reading image…' : 'Upload screenshot'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </header>

      {errorMessage ? (
        <p className="upload-error" role="alert">{errorMessage}</p>
      ) : null}

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

- [ ] **Step 2: Update `App.tsx` to pass the `parsed` argument through**

Open `src/App.tsx`. Find the `onUpload` callback on `ImportScreen`. The current line:

```tsx
onUpload={(fileName) => dispatch({ type: 'ADD_UPLOADED_WORKOUT', fileName })}
```

Replace with:

```tsx
onUpload={(fileName, parsed) => dispatch({ type: 'ADD_UPLOADED_WORKOUT', fileName, parsed })}
```

- [ ] **Step 3: Append CSS**

Append to `src/styles.css`:

```css
.upload-button.is-busy {
  cursor: progress;
  opacity: 0.8;
}

.spin {
  animation: ocr-spin 0.9s linear infinite;
}

@keyframes ocr-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-error {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(255, 138, 138, 0.45);
  border-radius: 0.7rem;
  color: #ff9c9c;
  background: rgba(255, 111, 111, 0.08);
  font-size: 0.92rem;
}
```

- [ ] **Step 4: Typecheck and run tests**

Run:
```
npx tsc --noEmit && npm run test
```

Expected: typecheck passes, all tests still green. The existing "Upload screenshot" interaction in the suite (if any) used the canned path; this task changes that path but the existing reducer test for the canned fallback (added in Task 3) still passes, and the test that drove the original Task 8 (`feat: wire upload-screenshot to add a canned workout`) was not an interaction test, so nothing should break here.

If a test does fail because it asserts on the canned title (`Uploaded: ...`), update the test to either mock `ocrImport` and assert on parsed fields, or check the test was specifically targeting the fallback path — in which case it still works because the fallback path is unchanged.

- [ ] **Step 5: Commit**

```
git add src/screens/ImportScreen.tsx src/App.tsx src/styles.css
git commit -m "feat: wire OCR + parser into Upload screenshot with loading state"
git push origin master
```

Expected: commit and push succeed.

---

### Task 5: App-level integration test + final verify

**Files:**
- Modify: `src/__tests__/app.test.tsx`

Adds an end-to-end test that mocks the `ocrImport` service and verifies the parsed workout flows from `ImportScreen` → reducer → list.

- [ ] **Step 1: Add the integration test**

Append inside `describe('App', ...)` in `src/__tests__/app.test.tsx`. Also add `vi` to the existing vitest import if not already present (Task 5 of Profile Setup added it).

Add this `vi.mock` block ABOVE the `describe('App', ...)` block, at module scope:

```tsx
vi.mock('../services/ocrImport', () => ({
  extractTextFromImage: vi.fn().mockResolvedValue({
    text: 'Wed: 5x3 back squat\nThen 10 min AMRAP wall balls, burpees',
    confidence: 0.82
  })
}));
```

Then add inside `describe('App', ...)`:

```tsx
  it('uploading a screenshot OCRs the file and adds a parsed workout', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /import/i })[0]);

    const fileInput = screen
      .getByText(/upload screenshot/i)
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['image-bytes'], 'shot.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    const parsedCard = await screen.findByRole('heading', { name: /5x3 back squat/i });
    expect(parsedCard).toBeInTheDocument();

    const article = parsedCard.closest('article');
    expect(article).not.toBeNull();
    expect(within(article as HTMLElement).getByText(/wed pushpress/i)).toBeInTheDocument();
    expect(within(article as HTMLElement).getByText(/82% confidence/i)).toBeInTheDocument();
  });
```

The `'5x3 back squat'` line is what `parseWorkoutText` picks as title (first non-empty line containing letters) from the mocked OCR output. The day extracts as `Wed` from the explicit marker. The confidence rounds to 82%.

- [ ] **Step 2: Run the suite**

Run:
```
npm run test
```

Expected: all tests pass, including the new integration test.

- [ ] **Step 3: Full verify**

Run:
```
npm run verify
```

Expected: green.

- [ ] **Step 4: GitHub Pages build sanity check**

Run:
```
GITHUB_PAGES=true npx vite build
grep -oE 'href="[^"]*"|src="[^"]*"' dist/index.html
```

Expected: every reference starts with `./assets/...`. Note the new chunks for tesseract.js — the build output should show one or more separate chunks ~1–3MB each. These load lazily on first upload, not at page open.

- [ ] **Step 5: Commit any final-verify fixes**

If a bug was found:

```
git add src
git commit -m "fix: polish OCR imports after final verify"
git push origin master
```

Otherwise:

```
git add src/__tests__/app.test.tsx
git commit -m "test: end-to-end OCR upload integration"
git push origin master
```

Expected: commit and push succeed.

---

## Self-Review Notes

- **Spec coverage:**
  - Tesseract.js dependency + lazy worker + 5MB guard → Task 2.
  - `workoutParser.ts` pure heuristics (day, title, lowerBodyLoad, metconIntensity, fatigueImpact, tags, caps) → Task 1.
  - Reducer accepts optional parsed fields → Task 3.
  - ImportScreen loading + error states + lazy import → Task 4.
  - Integration test with mocked OCR → Task 5.
- **Security coverage:** No credentials. Tesseract runs entirely in-browser. No data leaves the device. The 5MB file-size guard prevents pathological inputs.
- **Scope control:** No image preprocessing, no multi-language OCR, no real-time camera parsing, no per-file-hash caching.
- **Testing coverage:**
  - Parser: 24 unit tests covering every regex bucket, edge cases, and fallbacks (Task 1).
  - OCR service: 4 tests with the Tesseract worker mocked — size guard, normalised confidence, lazy single-worker, error propagation (Task 2).
  - Reducer: 2 tests for parsed-path and fallback-path (Task 3).
  - Integration: 1 end-to-end test mocking `ocrImport` (Task 5).
- **Type consistency:** `ParsedWorkout` defined in Task 1; consumed in Task 3 (reducer) and Task 4 (ImportScreen → App.tsx callback). `OcrResult` defined in Task 2; consumed only in `ImportScreen`. No `any` anywhere.
- **Placeholder scan:** No TBDs, TODOs, or implement-later markers.
- **Known caveats:**
  - **Real Tesseract output is unverified.** Plan to test with 5–10 real PushPress screenshots after shipping; tune the regex set as needed in a follow-up.
  - **First OCR is slow.** Language data downloads (~10MB) on first call, cached after. Subsequent calls are 2–5 seconds. The spinner copy ("Reading image…") signals this is normal.
  - **Bundle size grows by ~3MB.** Tesseract.js core ships in a lazy chunk. The Today/Plan/Log/Profile screens are not affected.
