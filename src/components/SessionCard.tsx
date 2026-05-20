import { AlertTriangle, Clock3 } from 'lucide-react';
import type { PlannedSession } from '../domain/types';

interface SessionCardProps {
  session: PlannedSession;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <article className={`session-card ${session.type}`}>
      <div className="session-card__header">
        <div>
          <span className="session-day">{session.day}</span>
          <h3>{session.title}</h3>
        </div>
        <span className={`intensity-chip ${session.intensity}`}>{session.intensity}</span>
      </div>
      <p>{session.purpose}</p>
      <div className="session-meta">
        <span>
          <Clock3 aria-hidden="true" />
          {session.durationMinutes} min
        </span>
        <span>{session.type.replace('-', ' ')}</span>
      </div>
      {session.warning ? (
        <div className="warning-line">
          <AlertTriangle aria-hidden="true" />
          <span>{session.warning}</span>
        </div>
      ) : null}
    </article>
  );
}
