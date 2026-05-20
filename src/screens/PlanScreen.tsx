import { SessionCard } from '../components/SessionCard';
import type { WeeklyPlan } from '../domain/types';

interface PlanScreenProps {
  plan: WeeklyPlan;
  onRestore: (sessionId: string) => void;
}

export function PlanScreen({ plan, onRestore }: PlanScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>{plan.weekLabel}</h1>
        </div>
        <button type="button" className="secondary-action">
          Regenerate week
        </button>
      </header>
      <div className="grid three">
        {plan.sessions.map((session) => (
          <SessionCard key={session.id} session={session} onRestore={onRestore} />
        ))}
      </div>
    </div>
  );
}
