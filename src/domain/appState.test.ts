import { describe, expect, it } from 'vitest';
import { demoImportedWorkouts } from './demoData';
import { appReducer, findNextHardPlannedSession, initialAppState, nextEmptyDay } from './appState';
import { findTaggedBySlug } from './planLibrary';
import type { AthleteProfile, PlannedSession, TrainingLog } from './types';

describe('findNextHardPlannedSession', () => {
  it('returns the first planned session whose intensity is high', () => {
    const session = findNextHardPlannedSession(initialAppState.plan);
    expect(session?.id).toBe('mon-cf');
  });

  it('returns undefined when no planned session has high intensity', () => {
    const plan = {
      ...initialAppState.plan,
      sessions: initialAppState.plan.sessions.map((session) => ({ ...session, intensity: 'low' as const }))
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
      ...initialAppState.plan,
      sessions: initialAppState.plan.sessions
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

  it('seeds planTags and planRationale from the starter library entry', () => {
    expect(initialAppState.planTags.slug).toBe('balanced-moderate');
    expect(initialAppState.planRationale).toMatch(/balanced hybrid week/i);
    expect(initialAppState.schemaVersion).toBe(2);
  });

  it('uses demo workouts and empty logs', () => {
    expect(initialAppState.workouts).toEqual(demoImportedWorkouts);
    expect(initialAppState.logs).toEqual([]);
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

  describe('PICK_NEW_PLAN', () => {
    const action = {
      type: 'PICK_NEW_PLAN' as const,
      readiness: { soreness: 7, energy: 7, sleepQuality: 7, mood: 7, painFlag: false },
      availability: initialAppState.profile.weeklyAvailability,
      goal: initialAppState.profile.currentGoal
    };

    it('replaces plan, planTags, and planRationale based on the picker result', () => {
      const next = appReducer(initialAppState, action);
      expect(next.planTags.slug).not.toBe(initialAppState.planTags.slug);
      expect(next.plan).toBe(findTaggedBySlug(next.planTags.slug)?.plan);
      expect(next.planRationale.length).toBeGreaterThan(0);
    });

    it('excludes the current plan from re-selection', () => {
      const next = appReducer(initialAppState, action);
      const again = appReducer(next, action);
      expect(again.planTags.slug).not.toBe(next.planTags.slug);
    });
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

  it('UPDATE_PROFILE replaces the profile and flips hasCustomizedProfile', () => {
    const nextProfile: AthleteProfile = { ...initialAppState.profile, name: 'Sam' };
    const next = appReducer(initialAppState, { type: 'UPDATE_PROFILE', profile: nextProfile });
    expect(next.profile).toBe(nextProfile);
    expect(next.hasCustomizedProfile).toBe(true);
  });

  it('UPDATE_PROFILE with the current profile reference returns state unchanged', () => {
    const next = appReducer(initialAppState, { type: 'UPDATE_PROFILE', profile: initialAppState.profile });
    expect(next).toBe(initialAppState);
  });

  it('DISMISS_PROFILE_PROMPT sets the flag to true', () => {
    const next = appReducer(initialAppState, { type: 'DISMISS_PROFILE_PROMPT' });
    expect(next.hasDismissedProfilePrompt).toBe(true);
  });

  it('DISMISS_PROFILE_PROMPT is a no-op when already dismissed', () => {
    const dismissed = appReducer(initialAppState, { type: 'DISMISS_PROFILE_PROMPT' });
    const again = appReducer(dismissed, { type: 'DISMISS_PROFILE_PROMPT' });
    expect(again).toBe(dismissed);
  });

  it('RESET_TO_DEMO resets profile and both profile flags', () => {
    const customProfile: AthleteProfile = { ...initialAppState.profile, name: 'Sam' };
    const dirty = appReducer(initialAppState, { type: 'UPDATE_PROFILE', profile: customProfile });
    const dismissed = appReducer(dirty, { type: 'DISMISS_PROFILE_PROMPT' });
    const reset = appReducer(dismissed, { type: 'RESET_TO_DEMO' });
    expect(reset.profile).toBe(initialAppState.profile);
    expect(reset.hasCustomizedProfile).toBe(false);
    expect(reset.hasDismissedProfilePrompt).toBe(false);
  });

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
});
