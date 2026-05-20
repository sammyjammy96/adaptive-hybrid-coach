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
const LIFTING_KEYWORDS = /strength|lift|crossfit|\bpr\b|squat|deadlift|snatch|clean|jerk/i;

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
      emphasis: { recovery: 2 },
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
