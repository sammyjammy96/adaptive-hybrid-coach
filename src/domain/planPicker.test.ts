import { describe, expect, it } from 'vitest';
import { pickPlan } from './planPicker';
import type { TrainingLog, ReadinessCheckIn, AvailabilityWindow } from './types';

const defaultAvailability: AvailabilityWindow[] = [
  { day: 'Mon', available: true, minutes: 60 },
  { day: 'Tue', available: true, minutes: 60 },
  { day: 'Wed', available: true, minutes: 60 },
  { day: 'Thu', available: true, minutes: 60 },
  { day: 'Fri', available: true, minutes: 60 },
  { day: 'Sat', available: true, minutes: 90 },
  { day: 'Sun', available: false, minutes: 0 }
];

const okReadiness: ReadinessCheckIn = {
  soreness: 7,
  energy: 7,
  sleepQuality: 7,
  mood: 7,
  painFlag: false
};

const painReadiness: ReadinessCheckIn = { ...okReadiness, painFlag: true };

function logWithRpe(rpe: number, sessionId = 'mon-cf', completion: TrainingLog['completion'] = 'completed'): TrainingLog {
  return { sessionId, completion, rpe, durationMinutes: 60, notes: '' };
}

describe('pickPlan', () => {
  it('new user with empty logs and balanced goal returns a balanced or moderate plan', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'Stay healthy and consistent'
    });
    expect(['balanced', 'recovery']).toContain(result.tagged.tags.emphasis);
    expect(result.tagged.tags.load).not.toBe('hard');
    expect(result.firedRules).toContain('no-signal-default');
  });

  it('pain flag forces recovery or easy plan regardless of other signals', () => {
    const result = pickPlan({
      logs: [logWithRpe(5), logWithRpe(5), logWithRpe(5)],
      readiness: painReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(['recovery', 'easy']).toContain(
      result.tagged.tags.emphasis === 'recovery' ? 'recovery' : result.tagged.tags.load
    );
    expect(result.firedRules).toContain('pain-flagged');
    expect(result.rationale.toLowerCase()).toContain('pain');
  });

  it('high recent RPE pushes load easy even with a running goal', () => {
    const logs = [logWithRpe(8), logWithRpe(8), logWithRpe(8), logWithRpe(8), logWithRpe(8)];
    const result = pickPlan({
      logs,
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(result.tagged.tags.load).toBe('easy');
    expect(result.firedRules).toContain('high-fatigue-recent');
  });

  it('skipped sessions in last week pushes volume low', () => {
    const logs: TrainingLog[] = [
      { sessionId: 'a', completion: 'skipped', rpe: 0, durationMinutes: 0, notes: '' },
      { sessionId: 'b', completion: 'skipped', rpe: 0, durationMinutes: 0, notes: '' }
    ];
    const result = pickPlan({
      logs,
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(result.tagged.tags.volume).toBe('low');
    expect(result.firedRules).toContain('skipped-sessions');
  });

  it('low readiness score pushes load easy', () => {
    const result = pickPlan({
      logs: [],
      readiness: { soreness: 3, energy: 3, sleepQuality: 3, mood: 4, painFlag: false },
      availability: defaultAvailability,
      goal: 'improve running'
    });
    expect(result.tagged.tags.load).toBe('easy');
    expect(result.firedRules).toContain('low-readiness');
  });

  it('goal mentions running → running emphasis', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'sub-20 5K'
    });
    expect(result.tagged.tags.emphasis).toBe('running');
    expect(result.firedRules).toContain('goal-running');
    expect(result.rationale.toLowerCase()).toContain('running');
  });

  it('goal mentions lifting/strength → lifting emphasis', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve back squat PR'
    });
    expect(result.tagged.tags.emphasis).toBe('lifting');
    expect(result.firedRules).toContain('goal-lifting');
  });

  it('goal mentions both → balanced emphasis', () => {
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'Improve running while keeping CrossFit performance sharp'
    });
    expect(result.tagged.tags.emphasis).toBe('balanced');
    expect(result.firedRules).toContain('goal-balanced');
  });

  it('tight availability filters out high-minDailyMinutes entries', () => {
    const tight: AvailabilityWindow[] = defaultAvailability.map((w) => ({ ...w, minutes: 25 }));
    const result = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: tight,
      goal: 'improve back squat PR'
    });
    expect(result.tagged.tags.minDailyMinutes).toBeLessThanOrEqual(30);
  });

  it('excludeSlugs skips the top scorer', () => {
    const base = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'sub-20 5K'
    });
    const next = pickPlan({
      logs: [],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'sub-20 5K',
      excludeSlugs: [base.tagged.tags.slug]
    });
    expect(next.tagged.tags.slug).not.toBe(base.tagged.tags.slug);
  });

  it('is deterministic — identical input produces identical output', () => {
    const input = {
      logs: [logWithRpe(6), logWithRpe(7)],
      readiness: okReadiness,
      availability: defaultAvailability,
      goal: 'improve running'
    };
    const a = pickPlan(input);
    const b = pickPlan(input);
    expect(a.tagged.tags.slug).toBe(b.tagged.tags.slug);
    expect(a.rationale).toBe(b.rationale);
    expect(a.score).toBe(b.score);
    expect(a.firedRules).toEqual(b.firedRules);
  });
});
