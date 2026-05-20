import { demoImportedWorkouts } from './demoData';
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
  plan: planTemplates[0],
  logs: [],
  planVariantIndex: 0,
  schemaVersion: 1
};

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function findNextHardPlannedSession(plan: WeeklyPlan): PlannedSession | undefined {
  return plan.sessions.find((session) => session.intensity === 'high' && session.status === 'planned');
}

export function nextEmptyDay(workouts: ImportedWorkout[]): string {
  const used = new Set(workouts.map((workout) => workout.day));
  return dayOrder.find((day) => !used.has(day)) ?? 'Thu';
}
