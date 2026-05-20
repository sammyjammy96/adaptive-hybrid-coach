import { AlertTriangle, Clock3 } from 'lucide-react';
import type { PlannedSession } from '../domain/types';

interface SessionCardProps {
  session: PlannedSession;
  onRestore?: (sessionId: string) => void;
}

export function SessionCard({ session, onRestore }: SessionCardProps) {
  const isModified = session.status === 'modified';
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
      {isModified && onRestore ? (
        <button type="button" className="restore-link" onClick={() => onRestore(session.id)}>
          Restore
        </button>
      ) : null}
    </article>
  );
}
