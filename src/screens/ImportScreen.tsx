import { CheckCircle2, RotateCcw, UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpload: (fileName: string) => void;
}

export function ImportScreen({ workouts, onApprove, onReject, onUpload }: ImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file.name);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <label className="primary-action icon-action upload-button">
          <UploadCloud aria-hidden="true" /> Upload screenshot
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="visually-hidden"
            onChange={handleFileChange}
          />
        </label>
      </header>
      <div className="grid">
        {workouts.map((workout) => {
          const isApproved = workout.reviewState === 'approved';
          return (
            <article className="panel import-card" key={workout.id}>
              <div>
                <p className="eyebrow">{workout.day} PushPress</p>
                <h2>{workout.title}</h2>
                <p>{workout.extractedText}</p>
              </div>
              <div className="tag-row">
                {workout.tags.map((tag) => (
                  <span className={`intensity-chip ${tag.level}`} key={tag.label}>{tag.label}</span>
                ))}
              </div>
              <div className="import-footer">
                <span className="status-chip">{Math.round(workout.confidence * 100)}% confidence</span>
                <div className="review-toggle" role="group" aria-label={`Review state for ${workout.title}`}>
                  <button
                    type="button"
                    className={`review-button approve ${isApproved ? 'is-active' : ''}`}
                    aria-pressed={isApproved}
                    onClick={() => onApprove(workout.id)}
                  >
                    <CheckCircle2 aria-hidden="true" /> Approve
                  </button>
                  <button
                    type="button"
                    className={`review-button reject ${!isApproved ? 'is-active' : ''}`}
                    aria-pressed={!isApproved}
                    onClick={() => onReject(workout.id)}
                  >
                    <RotateCcw aria-hidden="true" /> Needs review
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
