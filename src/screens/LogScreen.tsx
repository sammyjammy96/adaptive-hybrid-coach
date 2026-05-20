import { useEffect, useState } from 'react';
import type { CompletionState, TrainingLog, WeeklyPlan } from '../domain/types';

interface LogScreenProps {
  plan: WeeklyPlan;
  logs: TrainingLog[];
  onSaveLog: (log: TrainingLog) => void;
}

const COMPLETION_OPTIONS: { value: CompletionState; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'modified', label: 'Modified' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'moved', label: 'Moved' }
];

export function LogScreen({ plan, logs, onSaveLog }: LogScreenProps) {
  const [sessionId, setSessionId] = useState<string>(plan.sessions[0]?.id ?? '');
  const [completion, setCompletion] = useState<CompletionState>('completed');
  const [rpe, setRpe] = useState(7);
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (!savedFlag) return;
    const timeout = window.setTimeout(() => setSavedFlag(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedFlag]);

  const isValid = sessionId !== '' && rpe >= 1 && rpe <= 10 && duration >= 0;

  function handleSave() {
    if (!isValid) return;
    onSaveLog({ sessionId, completion, rpe, durationMinutes: duration, notes });
    setSavedFlag(true);
    setCompletion('completed');
    setRpe(7);
    setDuration(45);
    setNotes('');
  }

  const recentLogs = logs.slice(-3).reverse();
  const sessionLookup = new Map(plan.sessions.map((session) => [session.id, session]));

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Log</p>
          <h1>Fast post-workout check-in.</h1>
        </div>
      </header>
      <form className="panel log-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Which session
          <select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
            {plan.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.day} — {session.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Session result
          <select value={completion} onChange={(event) => setCompletion(event.target.value as CompletionState)}>
            {COMPLETION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          RPE ({rpe})
          <input
            type="range"
            min="1"
            max="10"
            value={rpe}
            onChange={(event) => setRpe(Number(event.target.value))}
          />
        </label>
        <label>
          Duration
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
        </label>
        <label>
          Notes
          <textarea
            rows={4}
            placeholder="What changed, what felt good, what felt risky?"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="log-actions">
          <button
            type="button"
            className="primary-action"
            onClick={handleSave}
            disabled={!isValid}
          >
            Save log
          </button>
          <span className={`saved-flag ${savedFlag ? 'is-visible' : ''}`} aria-live="polite">
            Saved
          </span>
        </div>
      </form>
      <section className="panel recent-logs" aria-label="Recent logs">
        <p className="eyebrow">Recent logs</p>
        {recentLogs.length === 0 ? (
          <p className="recent-logs__empty">No logs yet. Save your first session above.</p>
        ) : (
          <ul>
            {recentLogs.map((log, index) => {
              const session = sessionLookup.get(log.sessionId);
              return (
                <li key={`${log.sessionId}-${index}`}>
                  <strong>{session ? session.title : log.sessionId}</strong>
                  <span>{log.completion} · RPE {log.rpe} · {log.durationMinutes} min</span>
                  {log.notes ? <p>{log.notes}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
