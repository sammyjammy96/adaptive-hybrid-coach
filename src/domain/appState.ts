import { demoImportedWorkouts, demoProfile } from './demoData';
import { dayOrder } from './planning';
import { planTemplates, type PlanVariantIndex } from './planTemplates';
import type { AthleteProfile, ImportedWorkout, PlannedSession, ReviewState, TrainingLog, WeeklyPlan } from './types';

export type ScreenKey = 'today' | 'plan' | 'import' | 'log' | 'profile';

export interface AppState {
  activeScreen: ScreenKey;
  workouts: ImportedWorkout[];
  plan: WeeklyPlan;
  logs: TrainingLog[];
  planVariantIndex: PlanVariantIndex;
  schemaVersion: 1;
  profile: AthleteProfile;
  hasCustomizedProfile: boolean;
  hasDismissedProfilePrompt: boolean;
}

export const initialAppState: AppState = {
  activeScreen: 'today',
  workouts: demoImportedWorkouts,
  // variant 0 is the base plan (see planTemplates.ts and variantLabels)
  plan: planTemplates[0],
  logs: [],
  planVariantIndex: 0,
  schemaVersion: 1,
  profile: demoProfile,
  hasCustomizedProfile: false,
  hasDismissedProfilePrompt: false
};

export function findNextHardPlannedSession(plan: WeeklyPlan): PlannedSession | undefined {
  return plan.sessions.find((session) => session.intensity === 'high' && session.status === 'planned');
}

export function nextEmptyDay(workouts: ImportedWorkout[]): (typeof dayOrder)[number] {
  const used = new Set(workouts.map((workout) => workout.day));
  // Thu = middle of the week; arbitrary but stable so persisted state stays predictable.
  return dayOrder.find((day) => !used.has(day)) ?? 'Thu';
}

export type AppAction =
  | { type: 'SET_ACTIVE_SCREEN'; screen: ScreenKey }
  | { type: 'APPROVE_WORKOUT'; id: string }
  | { type: 'REJECT_WORKOUT'; id: string }
  | { type: 'APPLY_EASY_VERSION'; flavor: 'easier' | 'recovery' }
  | { type: 'RESTORE_SESSION'; sessionId: string }
  | { type: 'REGENERATE_WEEK' }
  | { type: 'ADD_UPLOADED_WORKOUT'; fileName: string }
  | { type: 'SAVE_LOG'; log: TrainingLog }
  | { type: 'UPDATE_PROFILE'; profile: AthleteProfile }
  | { type: 'DISMISS_PROFILE_PROMPT' }
  | { type: 'RESET_TO_DEMO' };

function setReviewState(workouts: ImportedWorkout[], id: string, reviewState: ReviewState): ImportedWorkout[] {
  let changed = false;
  const next = workouts.map((workout) => {
    if (workout.id !== id) return workout;
    changed = true;
    return { ...workout, reviewState };
  });
  return changed ? next : workouts;
}

function applyEasier(session: PlannedSession): PlannedSession {
  const alreadyEasier =
    session.title.startsWith('Easier: ') &&
    session.intensity === 'low' &&
    session.status === 'modified';
  if (alreadyEasier) {
    return session;
  }
  if (session.title.startsWith('Easier: ')) {
    return { ...session, intensity: 'low', status: 'modified' };
  }
  return {
    ...session,
    intensity: 'low',
    status: 'modified',
    title: `Easier: ${session.title}`
  };
}

function applyRecovery(session: PlannedSession): PlannedSession {
  return {
    ...session,
    type: 'recovery',
    title: 'Recovery session',
    purpose: 'Pain flagged — keep training conservative',
    intensity: 'low',
    status: 'modified'
  };
}

function uploadedWorkoutId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `uploaded-${crypto.randomUUID()}`;
  }
  return `uploaded-${Date.now().toString(36)}`;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_SCREEN':
      return { ...state, activeScreen: action.screen };

    case 'APPROVE_WORKOUT': {
      const workouts = setReviewState(state.workouts, action.id, 'approved');
      return workouts === state.workouts ? state : { ...state, workouts };
    }

    case 'REJECT_WORKOUT': {
      const workouts = setReviewState(state.workouts, action.id, 'needs-review');
      return workouts === state.workouts ? state : { ...state, workouts };
    }

    case 'APPLY_EASY_VERSION': {
      const target = findNextHardPlannedSession(state.plan);
      if (!target) return state;
      const transform = action.flavor === 'recovery' ? applyRecovery : applyEasier;
      const sessions = state.plan.sessions.map((session) =>
        session.id === target.id ? transform(session) : session
      );
      return { ...state, plan: { ...state.plan, sessions } };
    }

    case 'RESTORE_SESSION': {
      const template = planTemplates[state.planVariantIndex];
      const originalSession = template.sessions.find((s) => s.id === action.sessionId);
      if (!originalSession) return state;
      const sessions = state.plan.sessions.map((session) =>
        session.id === action.sessionId ? { ...originalSession } : session
      );
      return { ...state, plan: { ...state.plan, sessions } };
    }

    case 'REGENERATE_WEEK': {
      const nextIndex = ((state.planVariantIndex + 1) % 3) as PlanVariantIndex;
      return { ...state, planVariantIndex: nextIndex, plan: planTemplates[nextIndex] };
    }

    case 'ADD_UPLOADED_WORKOUT': {
      const day = nextEmptyDay(state.workouts);
      const workout: ImportedWorkout = {
        id: uploadedWorkoutId(),
        day,
        source: 'pushpress-screenshot',
        title: `Uploaded: ${action.fileName}`,
        extractedText:
          'Uploaded image processed in prototype mode. Real OCR runs through a future backend.',
        confidence: 0.65,
        reviewState: 'needs-review',
        lowerBodyLoad: 'moderate',
        metconIntensity: 'moderate',
        fatigueImpact: 'moderate',
        tags: [{ label: 'imported', level: 'moderate' }]
      };
      return { ...state, workouts: [...state.workouts, workout] };
    }

    case 'SAVE_LOG':
      return { ...state, logs: [...state.logs, action.log] };

    case 'UPDATE_PROFILE':
      if (action.profile === state.profile) return state;
      return { ...state, profile: action.profile, hasCustomizedProfile: true };

    case 'DISMISS_PROFILE_PROMPT':
      if (state.hasDismissedProfilePrompt) return state;
      return { ...state, hasDismissedProfilePrompt: true };

    case 'RESET_TO_DEMO':
      return initialAppState;

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
