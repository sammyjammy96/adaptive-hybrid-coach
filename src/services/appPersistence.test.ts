import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initialAppState } from '../domain/appState';
import { loadAppState, saveAppState } from './appPersistence';

const STATE_KEY = 'hybrid-coach-state-v1';
const LEGACY_KEY = 'hybrid-coach-active-screen';

describe('appPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns initial state when storage is empty', () => {
    expect(loadAppState()).toEqual(initialAppState);
  });

  it('round-trips the full state through localStorage', () => {
    const next = { ...initialAppState, activeScreen: 'plan' as const };
    saveAppState(next);
    expect(loadAppState()).toEqual(next);
  });

  it('returns initial state when stored JSON is corrupt', () => {
    window.localStorage.setItem(STATE_KEY, 'not json');
    expect(loadAppState()).toEqual(initialAppState);
  });

  it('returns initial state when schemaVersion does not match', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ ...initialAppState, schemaVersion: 0 })
    );
    expect(loadAppState()).toEqual(initialAppState);
  });

  it('migrates the legacy active-screen key on first load', () => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify('profile'));
    const loaded = loadAppState();
    expect(loaded.activeScreen).toBe('profile');
    expect(loaded.workouts).toEqual(initialAppState.workouts);
  });
});
