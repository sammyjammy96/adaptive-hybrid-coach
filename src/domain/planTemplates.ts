import { demoWeeklyPlan } from './demoData';
import type { WeeklyPlan } from './types';

const runningBiasPlan: WeeklyPlan = {
  weekLabel: 'May 20-26',
  sessions: [
    {
      id: 'mon-cf',
      day: 'Mon',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Quality lifting only, lighter metcon',
      durationMinutes: 45,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'tue-run',
      day: 'Tue',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Build durability without adding intensity',
      durationMinutes: 40,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'wed-run',
      day: 'Wed',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Extra aerobic volume',
      durationMinutes: 35,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'thu-quality',
      day: 'Thu',
      type: 'quality-run',
      title: 'Controlled intervals',
      purpose: 'Improve running speed with capped fatigue',
      durationMinutes: 50,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'sat-long',
      day: 'Sat',
      type: 'long-run',
      title: 'Long easy run',
      purpose: 'Extend aerobic base',
      durationMinutes: 75,
      intensity: 'low',
      status: 'planned'
    }
  ]
};

const liftingBiasPlan: WeeklyPlan = {
  weekLabel: 'May 20-26',
  sessions: [
    {
      id: 'mon-cf',
      day: 'Mon',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Heavy strength + metcon',
      durationMinutes: 70,
      intensity: 'high',
      status: 'planned',
      warning: 'Avoid hard running after this lower-body load.'
    },
    {
      id: 'tue-cf',
      day: 'Tue',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Gymnastics skill day',
      durationMinutes: 60,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'wed-run',
      day: 'Wed',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Recover legs between lifts',
      durationMinutes: 30,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'thu-cf',
      day: 'Thu',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Engine work',
      durationMinutes: 55,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'sat-long',
      day: 'Sat',
      type: 'long-run',
      title: 'Long easy run',
      purpose: 'Maintain aerobic base',
      durationMinutes: 45,
      intensity: 'low',
      status: 'planned'
    }
  ]
};

export const planTemplates = [demoWeeklyPlan, runningBiasPlan, liftingBiasPlan] as const;
export const variantLabels = ['base', 'running', 'lifting'] as const;
export type PlanVariantIndex = 0 | 1 | 2;
