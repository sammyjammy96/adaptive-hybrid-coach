import { Sparkles, X } from 'lucide-react';
import { CoachCard } from '../components/CoachCard';
import { LoadBalance } from '../components/LoadBalance';
import { MetricRing } from '../components/MetricRing';
import { SessionCard } from '../components/SessionCard';
import { findNextHardPlannedSession } from '../domain/appState';
import { calculateReadinessScore, getWeeklyBalance } from '../domain/planning';
import type { CoachRecommendation, PlannedSession, ReadinessCheckIn, WeeklyPlan } from '../domain/types';

interface TodayScreenProps {
  plan: WeeklyPlan;
  readiness: ReadinessCheckIn;
  recommendation: CoachRecommendation;
  onApplyEasyVersion: () => void;
  onRestore: (sessionId: string) => void;
  showProfilePrompt: boolean;
  onDismissProfilePrompt: () => void;
  onNavigateToProfile: () => void;
}

export function TodayScreen({
  plan,
  readiness,
  recommendation,
  onApplyEasyVersion,
  onRestore,
  showProfilePrompt,
  onDismissProfilePrompt,
  onNavigateToProfile
}: TodayScreenProps) {
  const nextSession = plan.sessions.find(
    (session) => session.status === 'planned' || session.status === 'modified'
  ) as PlannedSession;
  const readinessScore = calculateReadinessScore(readiness);
  const balance = getWeeklyBalance(plan);
  const canApplyEasy = findNextHardPlannedSession(plan) !== undefined;

  return (
    <div>
      {showProfilePrompt ? (
        <section className="profile-prompt" role="region" aria-label="Profile prompt">
          <div className="profile-prompt__icon">
            <Sparkles aria-hidden="true" />
          </div>
          <div className="profile-prompt__body">
            <p>Set up your profile to make Hybrid Coach feel like yours.</p>
            <button type="button" className="primary-action" onClick={onNavigateToProfile}>
              Set up profile
            </button>
          </div>
          <button
            type="button"
            className="profile-prompt__dismiss"
            aria-label="Dismiss profile prompt"
            onClick={onDismissProfilePrompt}
          >
            <X aria-hidden="true" />
          </button>
        </section>
      ) : null}
      <header className="screen-header">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Make the next session count.</h1>
        </div>
        <MetricRing label="Readiness" value={readinessScore} />
      </header>
      <div className="grid two">
        <div className="grid">
          <CoachCard
            recommendation={recommendation}
            onAction={onApplyEasyVersion}
            disabled={!canApplyEasy}
          />
          <SessionCard session={nextSession} onRestore={onRestore} />
        </div>
        <LoadBalance
          crossfitSessions={balance.crossfitSessions}
          runSessions={balance.runSessions}
          hardSessions={balance.hardSessions}
          label={balance.balanceLabel}
        />
      </div>
    </div>
  );
}
