import { initialAppState, type AppState, type ScreenKey } from '../domain/appState';
import { loadLocalValue, saveLocalValue } from './localStore';

const STATE_KEY = 'hybrid-coach-state-v1';
const LEGACY_SCREEN_KEY = 'hybrid-coach-active-screen';
const SCREEN_KEYS: readonly ScreenKey[] = ['today', 'plan', 'import', 'log', 'profile'];

function isScreenKey(value: unknown): value is ScreenKey {
  return typeof value === 'string' && (SCREEN_KEYS as readonly string[]).includes(value);
}

function migrateLegacyScreen(): AppState {
  const stored = loadLocalValue<unknown>(LEGACY_SCREEN_KEY, null);
  const activeScreen = isScreenKey(stored) ? stored : initialAppState.activeScreen;
  return { ...initialAppState, activeScreen };
}

export function loadAppState(): AppState {
  const raw = loadLocalValue<unknown>(STATE_KEY, null);
  if (raw === null) {
    return migrateLegacyScreen();
  }
  if (typeof raw !== 'object' || raw === null) {
    return initialAppState;
  }
  const candidate = raw as Partial<AppState>;
  if (candidate.schemaVersion !== 1) {
    return initialAppState;
  }
  return { ...initialAppState, ...candidate } as AppState;
}

export function saveAppState(state: AppState): boolean {
  return saveLocalValue(STATE_KEY, state);
}
