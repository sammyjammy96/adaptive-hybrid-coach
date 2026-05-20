import type {
  CoachRecommendation,
  ImportedWorkout,
  Intensity,
  PlannedSession,
  ReadinessCheckIn,
  SessionType,
  WeeklyPlan
} from './types';

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function nextDay(day: string) {
  const index = dayOrder.indexOf(day);
  return dayOrder[(index + 1) % dayOrder.length];
}

function isRun(type: SessionType) {
  return type === 'easy-run' || type === 'quality-run' || type === 'long-run';
}

function isHardSession(session: PlannedSession) {
  return session.intensity === 'high';
}

function protectIntensity(current: Intensity): Intensity {
  return current === 'high' ? 'moderate' : current;
}

export function calculateReadinessScore(checkIn: ReadinessCheckIn) {
  const base = (checkIn.sleepQuality * 0.35 + checkIn.energy * 0.35 + checkIn.mood * 0.3) * 10;
  const sorenessPenalty = checkIn.soreness * 0.25;
  const painPenalty = checkIn.painFlag ? 31 : 0;
  return Math.max(0, Math.round(base - sorenessPenalty - painPenalty));
}

export function protectRunsAfterHeavyLowerBody(plan: WeeklyPlan, workouts: ImportedWorkout[]): WeeklyPlan {
  const protectedDays = new Set(
    workouts
      .filter((workout) => workout.reviewState === 'approved' && workout.lowerBodyLoad === 'high')
      .map((workout) => nextDay(workout.day))
  );

  return {
    ...plan,
    sessions: plan.sessions.map((session) => {
      if (!protectedDays.has(session.day) || !isRun(session.type)) {
        return session;
      }

      return {
        ...session,
        intensity: protectIntensity(session.intensity),
        warning: 'Protected after high lower-body CrossFit load.'
      };
    })
  };
}

export function getWeeklyBalance(plan: WeeklyPlan) {
  const crossfitSessions = plan.sessions.filter((session) => session.type === 'crossfit').length;
  const runSessions = plan.sessions.filter((session) => isRun(session.type)).length;
  const hardSessions = plan.sessions.filter(isHardSession).length;
  const balanceLabel =
    crossfitSessions >= 2 && runSessions >= 2 && hardSessions <= 2
      ? 'Balanced hybrid week'
      : 'Needs coach review';

  return {
    crossfitSessions,
    runSessions,
    hardSessions,
    balanceLabel
  };
}

export function createCoachRecommendation(checkIn: ReadinessCheckIn): CoachRecommendation {
  const readiness = calculateReadinessScore(checkIn);

  if (checkIn.painFlag) {
    return {
      id: 'pain-flag',
      title: 'Protect the pain signal',
      body: 'Pain was flagged today. Keep training conservative and avoid intensity until this settles.',
      severity: 'recovery',
      actionLabel: 'Switch to recovery'
    };
  }

  if (readiness < 60) {
    return {
      id: 'low-readiness',
      title: 'Reduce intensity today',
      body: 'Readiness is low from soreness, sleep, or energy. Keep the next session easy and preserve consistency.',
      severity: 'recovery',
      actionLabel: 'Apply easier session'
    };
  }

  return {
    id: 'steady-plan',
    title: 'Plan looks balanced',
    body: 'Readiness supports the current plan. Keep the intended intensity and log how it feels after.',
    severity: 'info',
    actionLabel: 'Keep plan'
  };
}
