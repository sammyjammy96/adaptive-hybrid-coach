import { useState } from 'react';
import { AppChrome, type ScreenKey } from './components/AppChrome';
import {
  demoImportedWorkouts,
  demoProfile,
  demoReadiness,
  demoRecommendations,
  demoWeeklyPlan
} from './domain/demoData';
import { protectRunsAfterHeavyLowerBody } from './domain/planning';
import { ImportScreen } from './screens/ImportScreen';
import { LogScreen } from './screens/LogScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TodayScreen } from './screens/TodayScreen';
import { loadLocalValue, saveLocalValue } from './services/localStore';

function isScreenKey(value: string): value is ScreenKey {
  return ['today', 'plan', 'import', 'log', 'profile'].includes(value);
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(() => {
    const stored = loadLocalValue('hybrid-coach-active-screen', 'today');
    return isScreenKey(stored) ? stored : 'today';
  });
  const protectedPlan = protectRunsAfterHeavyLowerBody(demoWeeklyPlan, demoImportedWorkouts);

  function navigate(screen: ScreenKey) {
    setActiveScreen(screen);
    saveLocalValue('hybrid-coach-active-screen', screen);
  }

  return (
    <AppChrome activeScreen={activeScreen} onNavigate={navigate}>
      {activeScreen === 'today' ? (
        <TodayScreen plan={protectedPlan} readiness={demoReadiness} recommendation={demoRecommendations[0]} />
      ) : null}
      {activeScreen === 'plan' ? <PlanScreen plan={protectedPlan} /> : null}
      {activeScreen === 'import' ? <ImportScreen workouts={demoImportedWorkouts} /> : null}
      {activeScreen === 'log' ? <LogScreen /> : null}
      {activeScreen === 'profile' ? <ProfileScreen profile={demoProfile} /> : null}
    </AppChrome>
  );
}
