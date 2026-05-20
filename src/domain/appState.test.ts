import { describe, expect, it } from 'vitest';
import { demoImportedWorkouts, demoWeeklyPlan } from './demoData';
import { findNextHardPlannedSession, initialAppState, nextEmptyDay } from './appState';
import { planTemplates } from './planTemplates';
import type { PlannedSession } from './types';

describe('findNextHardPlannedSession', () => {
  it('returns the first planned session whose intensity is high', () => {
    const session = findNextHardPlannedSession(demoWeeklyPlan);
    expect(session?.id).toBe('mon-cf');
  });

  it('returns undefined when no planned session has high intensity', () => {
    const plan = {
      ...demoWeeklyPlan,
      sessions: demoWeeklyPlan.sessions.map((session) => ({ ...session, intensity: 'low' as const }))
    };
    expect(findNextHardPlannedSession(plan)).toBeUndefined();
  });

  it('returns the next high-intensity planned session, skipping completed ones', () => {
    const tueHard: PlannedSession = {
      id: 'tue-hard',
      day: 'Tue',
      type: 'crossfit',
      title: 'Heavy day',
      purpose: 'Test fixture',
      durationMinutes: 60,
      intensity: 'high',
      status: 'planned'
    };
    const plan = {
      ...demoWeeklyPlan,
      sessions: demoWeeklyPlan.sessions
        .map((session) => session.id === 'mon-cf' ? { ...session, status: 'completed' as const } : session)
        .concat(tueHard)
    };
    expect(findNextHardPlannedSession(plan)?.id).toBe('tue-hard');
  });
});

describe('nextEmptyDay', () => {
  it('returns the first day not already represented in workouts', () => {
    expect(nextEmptyDay(demoImportedWorkouts)).toBe('Tue');
  });

  it('falls back to Thu when every weekday day already has a workout', () => {
    const workouts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
      ...demoImportedWorkouts[0],
      id: `w-${day}`,
      day
    }));
    expect(nextEmptyDay(workouts)).toBe('Thu');
  });
});

describe('initialAppState', () => {
  it('starts on the today screen', () => {
    expect(initialAppState.activeScreen).toBe('today');
  });

  it('seeds plan from variant 0 (base)', () => {
    expect(initialAppState.plan).toBe(planTemplates[0]);
  });

  it('uses demo workouts and empty logs', () => {
    expect(initialAppState.workouts).toEqual(demoImportedWorkouts);
    expect(initialAppState.logs).toEqual([]);
    expect(initialAppState.planVariantIndex).toBe(0);
    expect(initialAppState.schemaVersion).toBe(1);
  });
});
