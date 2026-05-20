import { demoImportedWorkouts } from './demoData';
import { dayOrder } from './planning';
import { planTemplates, type PlanVariantIndex } from './planTemplates';
import type { ImportedWorkout, PlannedSession, TrainingLog, WeeklyPlan } from './types';

export type ScreenKey = 'today' | 'plan' | 'import' | 'log' | 'profile';

export interface AppState {
  activeScreen: ScreenKey;
  workouts: ImportedWorkout[];
  plan: WeeklyPlan;
  logs: TrainingLog[];
  planVariantIndex: PlanVariantIndex;
  schemaVersion: 1;
}

export const initialAppState: AppState = {
  activeScreen: 'today',
  workouts: demoImportedWorkouts,
  // variant 0 is the base plan (see planTemplates.ts and variantLabels)
  plan: planTemplates[0],
  logs: [],
  planVariantIndex: 0,
  schemaVersion: 1
};

export function findNextHardPlannedSession(plan: WeeklyPlan): PlannedSession | undefined {
  return plan.sessions.find((session) => session.intensity === 'high' && session.status === 'planned');
}

export function nextEmptyDay(workouts: ImportedWorkout[]): (typeof dayOrder)[number] {
  const used = new Set(workouts.map((workout) => workout.day));
  // Thu = middle of the week; arbitrary but stable so persisted state stays predictable.
  return dayOrder.find((day) => !used.has(day)) ?? 'Thu';
}
