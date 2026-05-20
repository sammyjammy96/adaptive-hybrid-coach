import { useEffect, useReducer } from 'react';
import { AppChrome, type ScreenKey } from './components/AppChrome';
import { appReducer, initialAppState } from './domain/appState';
import { demoReadiness, demoRecommendations } from './domain/demoData';
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
        <TodayScreen
          plan={protectedPlan}
          readiness={demoReadiness}
          recommendation={demoRecommendations[0]}
          onApplyEasyVersion={() =>
            dispatch({
              type: 'APPLY_EASY_VERSION',
              flavor: demoRecommendations[0].id === 'pain-flag' ? 'recovery' : 'easier'
            })
          }
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
          showProfilePrompt={!state.hasCustomizedProfile && !state.hasDismissedProfilePrompt}
          onDismissProfilePrompt={() => dispatch({ type: 'DISMISS_PROFILE_PROMPT' })}
          onNavigateToProfile={() => dispatch({ type: 'SET_ACTIVE_SCREEN', screen: 'profile' })}
        />
      ) : null}
      {state.activeScreen === 'plan' ? (
        <PlanScreen
          plan={protectedPlan}
          variantIndex={state.planVariantIndex}
          onRegenerateWeek={() => dispatch({ type: 'REGENERATE_WEEK' })}
          onRestore={(sessionId) => dispatch({ type: 'RESTORE_SESSION', sessionId })}
        />
      ) : null}
      {state.activeScreen === 'import' ? (
        <ImportScreen
          workouts={state.workouts}
          onApprove={(id) => dispatch({ type: 'APPROVE_WORKOUT', id })}
          onReject={(id) => dispatch({ type: 'REJECT_WORKOUT', id })}
          onUpload={(fileName) => dispatch({ type: 'ADD_UPLOADED_WORKOUT', fileName })}
        />
      ) : null}
      {state.activeScreen === 'log' ? (
        <LogScreen
          plan={protectedPlan}
          logs={state.logs}
          onSaveLog={(log) => dispatch({ type: 'SAVE_LOG', log })}
        />
      ) : null}
      {state.activeScreen === 'profile' ? (
        <ProfileScreen
          profile={state.profile}
          onUpdate={(profile) => dispatch({ type: 'UPDATE_PROFILE', profile })}
          onReset={() => dispatch({ type: 'RESET_TO_DEMO' })}
        />
      ) : null}
    </AppChrome>
  );
}
