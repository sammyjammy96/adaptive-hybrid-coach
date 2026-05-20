import { CheckCircle2, UploadCloud } from 'lucide-react';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
}

export function ImportScreen({ workouts }: ImportScreenProps) {
  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <button type="button" className="primary-action icon-action">
          <UploadCloud aria-hidden="true" /> Upload screenshot
        </button>
      </header>
      <div className="grid">
        {workouts.map((workout) => (
          <article className="panel import-card" key={workout.id}>
            <div>
              <p className="eyebrow">{workout.day} PushPress</p>
              <h2>{workout.title}</h2>
              <p>{workout.extractedText}</p>
            </div>
            <div className="tag-row">
              {workout.tags.map((tag) => (
                <span className={`intensity-chip ${tag.level}`} key={tag.label}>
                  {tag.label}
                </span>
              ))}
            </div>
            <div className="import-footer">
              <span className="status-chip">{Math.round(workout.confidence * 100)}% confidence</span>
              <span className="status-chip">
                <CheckCircle2 aria-hidden="true" />
                {workout.reviewState === 'approved' ? 'approved' : 'needs review'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
