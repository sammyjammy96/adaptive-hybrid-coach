import { SessionCard } from '../components/SessionCard';
import { variantLabels, type PlanVariantIndex } from '../domain/planTemplates';
import type { WeeklyPlan } from '../domain/types';

interface PlanScreenProps {
  plan: WeeklyPlan;
  variantIndex: PlanVariantIndex;
  onRegenerateWeek: () => void;
  onRestore: (sessionId: string) => void;
}

export function PlanScreen({ plan, variantIndex, onRegenerateWeek, onRestore }: PlanScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>{plan.weekLabel}</h1>
        </div>
        <div className="plan-header-actions">
          <span className="variant-pill">Variant: {variantLabels[variantIndex]}</span>
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
