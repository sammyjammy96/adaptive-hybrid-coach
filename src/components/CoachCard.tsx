import { ShieldAlert, Sparkles } from 'lucide-react';
import type { CoachRecommendation } from '../domain/types';

interface CoachCardProps {
  recommendation: CoachRecommendation;
}

export function CoachCard({ recommendation }: CoachCardProps) {
  const isRecovery = recommendation.severity === 'recovery' || recommendation.severity === 'caution';
  const Icon = isRecovery ? ShieldAlert : Sparkles;

  return (
    <section className={`coach-card ${recommendation.severity}`}>
      <div className="coach-card__icon">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">Coach signal</p>
        <h2>{recommendation.title}</h2>
        <p>{recommendation.body}</p>
        <button type="button" className="primary-action">
          {recommendation.actionLabel}
        </button>
      </div>
    </section>
  );
}
