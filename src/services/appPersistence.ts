import { initialAppState, type AppState, type ScreenKey } from '../domain/appState';
import { loadLocalValue, saveLocalValue } from './localStore';

export const STATE_KEY = 'hybrid-coach-state-v1';
export const LEGACY_SCREEN_KEY = 'hybrid-coach-active-screen';
const SCREEN_KEYS: readonly ScreenKey[] = ['today', 'plan', 'import', 'log', 'profile'];

function isScreenKey(value: unknown): value is ScreenKey {
  return typeof value === 'string' && (SCREEN_KEYS as readonly string[]).includes(value);
}

function isValidShape(candidate: Partial<AppState>): boolean {
  if (!Array.isArray(candidate.workouts)) return false;
  if (!Array.isArray(candidate.logs)) return false;
  if (!candidate.plan || !Array.isArray(candidate.plan.sessions)) return false;
  return true;
}

function initialStateWithLegacyScreen(): AppState {
  const stored = loadLocalValue<unknown>(LEGACY_SCREEN_KEY, null);
  const activeScreen = isScreenKey(stored) ? stored : initialAppState.activeScreen;
  if (stored !== null) {
    window.localStorage.removeItem(LEGACY_SCREEN_KEY);
  }
  return { ...initialAppState, activeScreen };
}

export function loadAppState(): AppState {
  const raw = loadLocalValue<unknown>(STATE_KEY, null);
  if (raw === null) {
    return initialStateWithLegacyScreen();
  }
  if (typeof raw !== 'object') {
    return initialAppState;
  }
  const candidate = raw as Partial<AppState>;
  if (candidate.schemaVersion !== 1) {
    return initialAppState;
  }
  if (!isValidShape(candidate)) {
    return initialAppState;
  }
  return { ...initialAppState, ...candidate } as AppState;
}

export function saveAppState(state: AppState): boolean {
  return saveLocalValue(STATE_KEY, state);
}
