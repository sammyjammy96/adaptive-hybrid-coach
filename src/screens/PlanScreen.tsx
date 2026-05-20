import { SessionCard } from '../components/SessionCard';
import type { PlanTags } from '../domain/planLibrary';
import type { WeeklyPlan } from '../domain/types';

interface PlanScreenProps {
  plan: WeeklyPlan;
  tags: PlanTags;
  onRegenerateWeek: () => void;
  onRestore: (sessionId: string) => void;
}

export function PlanScreen({ plan, tags, onRegenerateWeek, onRestore }: PlanScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>{plan.weekLabel}</h1>
        </div>
        <div className="plan-header-actions">
          <span className="tag-summary">
            Tags: {tags.emphasis} · {tags.load} · {tags.volume}
          </span>
          <button type="button" className="secondary-action" onClick={onRegenerateWeek}>
            Regenerate week
          </button>
        </div>
      </header>
      <div className="grid three">
        {plan.sessions.map((session) => (
          <SessionCard key={session.id} session={session} onRestore={onRestore} />
        ))}
      </div>
    </div>
  );
}
