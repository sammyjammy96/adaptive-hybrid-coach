import { CoachCard } from '../components/CoachCard';
import { LoadBalance } from '../components/LoadBalance';
import { MetricRing } from '../components/MetricRing';
import { SessionCard } from '../components/SessionCard';
import { calculateReadinessScore, getWeeklyBalance } from '../domain/planning';
import type { CoachRecommendation, PlannedSession, ReadinessCheckIn, WeeklyPlan } from '../domain/types';

interface TodayScreenProps {
  plan: WeeklyPlan;
  readiness: ReadinessCheckIn;
  recommendation: CoachRecommendation;
}

export function TodayScreen({ plan, readiness, recommendation }: TodayScreenProps) {
  const nextSession = plan.sessions.find((session) => session.status === 'planned') as PlannedSession;
  const readinessScore = calculateReadinessScore(readiness);
  const balance = getWeeklyBalance(plan);

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Make the next session count.</h1>
        </div>
        <MetricRing label="Readiness" value={readinessScore} />
      </header>
      <div className="grid two">
        <div className="grid">
          <CoachCard recommendation={recommendation} />
          <SessionCard session={nextSession} />
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
