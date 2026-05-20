import type { TrainingLog, WeeklyPlan } from '../domain/types';

interface LogScreenProps {
  plan: WeeklyPlan;
  logs: TrainingLog[];
}

export function LogScreen(_props: LogScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Log</p>
          <h1>Fast post-workout check-in.</h1>
        </div>
      </header>
      <form className="panel log-form">
        <label>
          Session result
          <select defaultValue="completed">
            <option value="completed">Completed</option>
            <option value="modified">Modified</option>
            <option value="skipped">Skipped</option>
            <option value="moved">Moved</option>
          </select>
        </label>
        <label>
          RPE
          <input type="range" min="1" max="10" defaultValue="7" />
        </label>
        <label>
          Duration
          <input type="number" min="0" defaultValue="45" />
        </label>
        <label>
          Notes
          <textarea rows={4} placeholder="What changed, what felt good, what felt risky?" />
        </label>
        <button type="button" className="primary-action">Save log</button>
      </form>
    </div>
  );
}
