import { describe, expect, it } from 'vitest';
import { parseWorkoutText } from './workoutParser';

describe('parseWorkoutText', () => {
  it('extracts a day from explicit weekday markers', () => {
    const result = parseWorkoutText('Wed: 5x3 back squat\nThen 10 min AMRAP wall balls, burpees');
    expect(result.day).toBe('Wed');
  });

  it('uses dayHint when no weekday marker is present', () => {
    const result = parseWorkoutText('5x3 back squat\n10 min AMRAP', { dayHint: 'Fri' });
    expect(result.day).toBe('Fri');
  });

  it('falls back to Thu when no weekday marker and no hint', () => {
    const result = parseWorkoutText('5x3 back squat');
    expect(result.day).toBe('Thu');
  });

  it('uses the first non-numeric, non-empty line as title (capped at 60 chars)', () => {
    const result = parseWorkoutText('5x3 back squat\nThen accessory work, then a long metcon');
    expect(result.title.startsWith('5x3 back squat')).toBe(false);
    expect(result.title).toBe('Then accessory work, then a long metcon');
  });

  it('falls back to "Imported workout" when no non-numeric line exists', () => {
    const result = parseWorkoutText('5x3\n10x2\n4x5');
    expect(result.title).toBe('Imported workout');
  });

  it('caps title at 60 characters', () => {
    const longLine = 'A'.repeat(120);
    const result = parseWorkoutText(longLine);
    expect(result.title.length).toBe(60);
  });

  it('caps extractedText at 500 characters', () => {
    const longText = 'X'.repeat(900);
    const result = parseWorkoutText(longText);
    expect(result.extractedText.length).toBe(500);
  });

  it('classifies lower-body load as high for squat/deadlift/clean/snatch/lunge/box jump/wall ball', () => {
    expect(parseWorkoutText('5x3 back squat').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Heavy deadlift triple').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Power clean ladder').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Snatch complex 1+1+1').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Walking lunges 100m').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Box jump pyramid').lowerBodyLoad).toBe('high');
    expect(parseWorkoutText('Wall ball 30 reps').lowerBodyLoad).toBe('high');
  });

  it('classifies lower-body load as moderate for running/row/bike', () => {
    expect(parseWorkoutText('5K run easy').lowerBodyLoad).toBe('moderate');
    expect(parseWorkoutText('2000m row test').lowerBodyLoad).toBe('moderate');
    expect(parseWorkoutText('30 min bike z2').lowerBodyLoad).toBe('moderate');
  });

  it('classifies lower-body load as low when nothing matches', () => {
    expect(parseWorkoutText('Strict press 5x5\nPull-up skill').lowerBodyLoad).toBe('low');
  });

  it('classifies metcon intensity as high for AMRAP/EMOM/HIIT/sprint/for time', () => {
    expect(parseWorkoutText('15 min AMRAP burpees, pull-ups').metconIntensity).toBe('high');
    expect(parseWorkoutText('EMOM 10: 5 thrusters').metconIntensity).toBe('high');
    expect(parseWorkoutText('HIIT bike intervals').metconIntensity).toBe('high');
    expect(parseWorkoutText('Sprint repeats').metconIntensity).toBe('high');
    expect(parseWorkoutText('100 burpees For time').metconIntensity).toBe('high');
  });

  it('classifies metcon intensity as moderate for intervals/tempo/threshold', () => {
    expect(parseWorkoutText('800m intervals').metconIntensity).toBe('moderate');
    expect(parseWorkoutText('Tempo run 30 min').metconIntensity).toBe('moderate');
    expect(parseWorkoutText('Threshold pace 5x1 mile').metconIntensity).toBe('moderate');
  });

  it('classifies metcon intensity as low when nothing matches', () => {
    expect(parseWorkoutText('5x3 back squat').metconIntensity).toBe('low');
  });

  it('computes fatigueImpact as average of lower-body and metcon (high+high = high)', () => {
    const result = parseWorkoutText('AMRAP 12: back squat + box jump');
    expect(result.fatigueImpact).toBe('high');
  });

  it('computes fatigueImpact as moderate when one signal is high and the other low', () => {
    const result = parseWorkoutText('5x3 back squat');
    expect(result.lowerBodyLoad).toBe('high');
    expect(result.metconIntensity).toBe('low');
    expect(result.fatigueImpact).toBe('moderate');
  });

  it('computes fatigueImpact as low when both signals are low', () => {
    const result = parseWorkoutText('Strict press 5x5\nPull-up skill');
    expect(result.fatigueImpact).toBe('low');
  });

  it('emits a lower-body tag when matched', () => {
    const result = parseWorkoutText('5x3 back squat');
    const tag = result.tags.find((t) => t.label === 'lower body');
    expect(tag?.level).toBe('high');
  });

  it('emits a metcon tag when matched', () => {
    const result = parseWorkoutText('15 min AMRAP burpees');
    const tag = result.tags.find((t) => t.label === 'metcon');
    expect(tag?.level).toBe('high');
  });

  it('emits at most 4 tags', () => {
    const result = parseWorkoutText(
      'Wed AMRAP back squat box jump wall ball deadlift snatch lunge'
    );
    expect(result.tags.length).toBeLessThanOrEqual(4);
  });

  it('passes through confidence (0–1) from options', () => {
    const result = parseWorkoutText('5x3 back squat', { confidence: 0.72 });
    expect(result.confidence).toBe(0.72);
  });

  it('defaults confidence to 1 when not provided', () => {
    const result = parseWorkoutText('5x3 back squat');
    expect(result.confidence).toBe(1);
  });

  it('handles empty input without throwing', () => {
    const result = parseWorkoutText('');
    expect(result.title).toBe('Imported workout');
    expect(result.day).toBe('Thu');
    expect(result.lowerBodyLoad).toBe('low');
    expect(result.metconIntensity).toBe('low');
    expect(result.tags).toEqual([]);
  });

  it('handles all-numeric input without throwing', () => {
    const result = parseWorkoutText('5x3\n10x2\n100');
    expect(result.title).toBe('Imported workout');
  });
});
