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

export function findTaggedBySlug(slug: string): TaggedPlan | undefined {
  return planLibrary.find((entry) => entry.tags.slug === slug);
}
