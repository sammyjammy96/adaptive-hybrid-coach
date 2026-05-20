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

/** A line is considered "numeric" (and skipped for title) when it starts with
 *  a digit — pure numbers, set×rep notations like "5x3", or lines that open
 *  with a quantity like "5x3 back squat".  Lines that start with a letter are
 *  kept as title candidates. */
const NUMERIC_LINE = /^\d/;

function pickTitle(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines) {
    if (!NUMERIC_LINE.test(line) && /[A-Za-z]/.test(line)) {
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
