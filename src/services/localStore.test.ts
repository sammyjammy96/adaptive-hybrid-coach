import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLocalValue, saveLocalValue } from './localStore';

describe('localStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads fallback when no value exists', () => {
    expect(loadLocalValue('missing', 'fallback')).toBe('fallback');
  });

  it('saves and loads JSON values', () => {
    expect(saveLocalValue('screen', 'plan')).toBe(true);
    expect(loadLocalValue('screen', 'today')).toBe('plan');
  });

  it('returns fallback when stored data is invalid JSON', () => {
    window.localStorage.setItem('bad', '{');
    expect(loadLocalValue('bad', 'safe')).toBe('safe');
  });

  it('reports failed saves without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(saveLocalValue('screen', 'today')).toBe(false);
  });
});
