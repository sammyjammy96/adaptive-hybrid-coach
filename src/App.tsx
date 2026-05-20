import { useEffect, useReducer } from 'react';
import { AppChrome, type ScreenKey } from './components/AppChrome';
import { appReducer, initialAppState } from './domain/appState';
import { demoProfile, demoReadiness, demoRecommendations } from './domain/demoData';
import { protectRunsAfterHeavyLowerBody } from './domain/planning';
import { ImportScreen } from './screens/ImportScreen';
import { LogScreen } from './screens/LogScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TodayScreen } from './screens/TodayScreen';
import { loadAppState, saveAppState } from './services/appPersistence';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppState);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const protectedPlan = protectRunsAfterHeavyLowerBody(state.plan, state.workouts);

  function navigate(screen: ScreenKey) {
    dispatch({ type: 'SET_ACTIVE_SCREEN', screen });
  }

  return (
    <AppChrome activeScreen={state.activeScreen} onNavigate={navigate}>
      {state.activeScreen === 'today' ? (
        <TodayScreen plan={protectedPlan} readiness={demoReadiness} recommendation={demoRecommendations[0]} />
      ) : null}
      {state.activeScreen === 'plan' ? <PlanScreen plan={protectedPlan} /> : null}
      {state.activeScreen === 'import' ? (
        <ImportScreen
          workouts={state.workouts}
          onApprove={(id) => dispatch({ type: 'APPROVE_WORKOUT', id })}
          onReject={(id) => dispatch({ type: 'REJECT_WORKOUT', id })}
        />
      ) : null}
      {state.activeScreen === 'log' ? <LogScreen plan={protectedPlan} logs={state.logs} /> : null}
      {state.activeScreen === 'profile' ? <ProfileScreen profile={demoProfile} /> : null}
    </AppChrome>
  );
}
