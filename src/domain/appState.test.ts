import { describe, expect, it } from 'vitest';
import { demoImportedWorkouts, demoWeeklyPlan } from './demoData';
import { appReducer, findNextHardPlannedSession, initialAppState, nextEmptyDay } from './appState';
import { planTemplates } from './planTemplates';
import type { PlannedSession, TrainingLog } from './types';

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

describe('appReducer', () => {
  it('SET_ACTIVE_SCREEN updates activeScreen', () => {
    const next = appReducer(initialAppState, { type: 'SET_ACTIVE_SCREEN', screen: 'plan' });
    expect(next.activeScreen).toBe('plan');
  });

  it('APPROVE_WORKOUT flips reviewState to approved', () => {
    const next = appReducer(initialAppState, { type: 'APPROVE_WORKOUT', id: 'cf-wed' });
    expect(next.workouts.find((w) => w.id === 'cf-wed')?.reviewState).toBe('approved');
  });

  it('APPROVE_WORKOUT is a no-op for an unknown id', () => {
    const next = appReducer(initialAppState, { type: 'APPROVE_WORKOUT', id: 'does-not-exist' });
    expect(next).toBe(initialAppState);
    expect(next.workouts).toBe(initialAppState.workouts);
  });

  it('REJECT_WORKOUT sets reviewState back to needs-review', () => {
    const next = appReducer(initialAppState, { type: 'REJECT_WORKOUT', id: 'cf-mon' });
    expect(next.workouts.find((w) => w.id === 'cf-mon')?.reviewState).toBe('needs-review');
  });

  it('APPLY_EASY_VERSION easier flavor lowers intensity and marks session as modified', () => {
    const next = appReducer(initialAppState, { type: 'APPLY_EASY_VERSION', flavor: 'easier' });
    const monday = next.plan.sessions.find((s) => s.id === 'mon-cf');
    expect(monday?.intensity).toBe('low');
    expect(monday?.status).toBe('modified');
    expect(monday?.title.startsWith('Easier: ')).toBe(true);
  });

  it('APPLY_EASY_VERSION recovery flavor swaps the session to a recovery type', () => {
    const next = appReducer(initialAppState, { type: 'APPLY_EASY_VERSION', flavor: 'recovery' });
    const monday = next.plan.sessions.find((s) => s.id === 'mon-cf');
    expect(monday?.type).toBe('recovery');
    expect(monday?.intensity).toBe('low');
    expect(monday?.status).toBe('modified');
    expect(monday?.title).toBe('Recovery session');
  });

  it('APPLY_EASY_VERSION is a no-op when no eligible session exists', () => {
    const plan = {
      ...initialAppState.plan,
      sessions: initialAppState.plan.sessions.map((s) => ({ ...s, intensity: 'low' as const }))
    };
    const state = { ...initialAppState, plan };
    const next = appReducer(state, { type: 'APPLY_EASY_VERSION', flavor: 'easier' });
    expect(next).toBe(state);
    expect(next.plan).toBe(plan);
  });

  it('RESTORE_SESSION reverts a modified session to the variant template version', () => {
    const modified = appReducer(initialAppState, { type: 'APPLY_EASY_VERSION', flavor: 'easier' });
    const restored = appReducer(modified, { type: 'RESTORE_SESSION', sessionId: 'mon-cf' });
    const monday = restored.plan.sessions.find((s) => s.id === 'mon-cf');
    const original = initialAppState.plan.sessions.find((s) => s.id === 'mon-cf');
    expect(monday).toEqual(original);
  });

  it('RESTORE_SESSION is a no-op for an unknown session id', () => {
    const next = appReducer(initialAppState, { type: 'RESTORE_SESSION', sessionId: 'no-such-id' });
    expect(next).toBe(initialAppState);
    expect(next.plan).toBe(initialAppState.plan);
  });

  it('REGENERATE_WEEK cycles to the next variant', () => {
    const next = appReducer(initialAppState, { type: 'REGENERATE_WEEK' });
    expect(next.planVariantIndex).toBe(1);
    expect(next.plan).toBe(planTemplates[1]);
  });

  it('REGENERATE_WEEK wraps from variant 2 back to 0', () => {
    const state = { ...initialAppState, planVariantIndex: 2 as const };
    const next = appReducer(state, { type: 'REGENERATE_WEEK' });
    expect(next.planVariantIndex).toBe(0);
  });

  it('ADD_UPLOADED_WORKOUT appends an imported workout with expected fields', () => {
    const next = appReducer(initialAppState, { type: 'ADD_UPLOADED_WORKOUT', fileName: 'screenshot.png' });
    expect(next.workouts.length).toBe(initialAppState.workouts.length + 1);
    const added = next.workouts[next.workouts.length - 1];
    expect(added.source).toBe('pushpress-screenshot');
    expect(added.reviewState).toBe('needs-review');
    expect(added.title).toBe('Uploaded: screenshot.png');
    expect(added.id.startsWith('uploaded-')).toBe(true);
    expect(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).toContain(added.day);
  });

  it('SAVE_LOG appends to logs array', () => {
    const log: TrainingLog = {
      sessionId: 'mon-cf',
      completion: 'completed',
      rpe: 7,
      durationMinutes: 60,
      notes: 'felt good'
    };
    const next = appReducer(initialAppState, { type: 'SAVE_LOG', log });
    expect(next.logs).toEqual([log]);
  });

  it('RESET_TO_DEMO returns initial state', () => {
    const log: TrainingLog = { sessionId: 'mon-cf', completion: 'completed', rpe: 7, durationMinutes: 60, notes: '' };
    const dirty = appReducer(initialAppState, { type: 'SAVE_LOG', log });
    const reset = appReducer(dirty, { type: 'RESET_TO_DEMO' });
    expect(reset).toBe(initialAppState);
  });
});
