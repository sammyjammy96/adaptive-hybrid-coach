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
