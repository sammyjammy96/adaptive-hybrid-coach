import { describe, expect, it } from 'vitest';
import { demoWeeklyPlan } from './demoData';
import {
  calculateReadinessScore,
  createCoachRecommendation,
  getWeeklyBalance,
  protectRunsAfterHeavyLowerBody
} from './planning';
import type { ImportedWorkout, ReadinessCheckIn } from './types';

describe('planning helpers', () => {
  it('calculates a readiness score from sleep, energy, soreness, and pain', () => {
    const checkIn: ReadinessCheckIn = {
      soreness: 7,
      energy: 6,
      sleepQuality: 5,
      mood: 7,
      painFlag: false
    };

    expect(calculateReadinessScore(checkIn)).toBe(58);
  });

  it('drops readiness sharply when pain is flagged', () => {
    const checkIn: ReadinessCheckIn = {
      soreness: 3,
      energy: 8,
      sleepQuality: 8,
      mood: 8,
      painFlag: true
    };

    expect(calculateReadinessScore(checkIn)).toBe(48);
  });

  it('warns when a hard run follows high lower-body CrossFit load', () => {
    const workout: ImportedWorkout = {
      id: 'cf-mon',
      day: 'Mon',
      source: 'pushpress-screenshot',
      title: 'Squat day',
      extractedText: 'Heavy squats and box jumps',
      confidence: 0.9,
      reviewState: 'approved',
      lowerBodyLoad: 'high',
      metconIntensity: 'high',
      fatigueImpact: 'high',
      tags: []
    };

    const protectedPlan = protectRunsAfterHeavyLowerBody(demoWeeklyPlan, [workout]);
    const tuesdayRun = protectedPlan.sessions.find((session) => session.id === 'tue-run');

    expect(tuesdayRun?.intensity).toBe('low');
    expect(tuesdayRun?.warning).toContain('lower-body');
  });

  it('summarizes weekly balance without exposing distracting stats', () => {
    expect(getWeeklyBalance(demoWeeklyPlan)).toEqual({
      crossfitSessions: 2,
      runSessions: 3,
      hardSessions: 1,
      balanceLabel: 'Balanced hybrid week'
    });
  });

  it('creates conservative recommendations for low readiness', () => {
    const recommendation = createCoachRecommendation({
      soreness: 8,
      energy: 3,
      sleepQuality: 4,
      mood: 5,
      painFlag: false
    });

    expect(recommendation.severity).toBe('recovery');
    expect(recommendation.title).toBe('Reduce intensity today');
  });
});
