import { describe, expect, it } from 'vitest';
import { findTaggedBySlug, planLibrary } from './planLibrary';
import type { PlanEmphasis, PlanLoad } from './planLibrary';

describe('planLibrary', () => {
  it('has at least 6 entries', () => {
    expect(planLibrary.length).toBeGreaterThanOrEqual(6);
  });

  it('has at least one entry for every emphasis', () => {
    const emphases: PlanEmphasis[] = ['running', 'lifting', 'balanced', 'recovery'];
    for (const emphasis of emphases) {
      const hits = planLibrary.filter((entry) => entry.tags.emphasis === emphasis);
      expect(hits.length, `missing emphasis: ${emphasis}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('has at least one entry for every load', () => {
    const loads: PlanLoad[] = ['easy', 'moderate', 'hard'];
    for (const load of loads) {
      const hits = planLibrary.filter((entry) => entry.tags.load === load);
      expect(hits.length, `missing load: ${load}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('has unique slugs', () => {
    const slugs = planLibrary.map((entry) => entry.tags.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('keeps each entry minDailyMinutes ≤ its longest session duration', () => {
    for (const entry of planLibrary) {
      const longest = Math.max(...entry.plan.sessions.map((session) => session.durationMinutes));
      expect(
        entry.tags.minDailyMinutes,
        `${entry.tags.slug}: minDailyMinutes ${entry.tags.minDailyMinutes} > longest session ${longest}`
      ).toBeLessThanOrEqual(longest);
    }
  });

  it('every plan has at least 3 sessions', () => {
    for (const entry of planLibrary) {
      expect(entry.plan.sessions.length, `${entry.tags.slug}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('findTaggedBySlug returns the matching entry or undefined', () => {
    const first = planLibrary[0];
    expect(findTaggedBySlug(first.tags.slug)).toBe(first);
    expect(findTaggedBySlug('no-such-slug')).toBeUndefined();
  });
});
