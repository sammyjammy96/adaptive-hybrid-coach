import { CheckCircle2, Loader2, RotateCcw, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { parseWorkoutText, type ParsedWorkout } from '../domain/workoutParser';
import type { ImportedWorkout } from '../domain/types';

interface ImportScreenProps {
  workouts: ImportedWorkout[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpload: (fileName: string, parsed?: ParsedWorkout) => void;
}

type UploadStatus = 'idle' | 'processing' | 'error';

const ERROR_VISIBLE_MS = 5000;

export function ImportScreen({ workouts, onApprove, onReject, onUpload }: ImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'error') return;
    const timeout = window.setTimeout(() => {
      setStatus('idle');
      setErrorMessage(null);
    }, ERROR_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    setStatus('processing');
    setErrorMessage(null);

    try {
      const { extractTextFromImage } = await import('../services/ocrImport');
      const result = await extractTextFromImage(file);
      const parsed = parseWorkoutText(result.text, { confidence: result.confidence });
      onUpload(file.name, parsed);
      setStatus('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read this image.';
      setErrorMessage(`${message} Saved as needs-review.`);
      setStatus('error');
      onUpload(file.name);
    }
  }

  const isProcessing = status === 'processing';

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Import</p>
          <h1>Review gym programming before it affects the plan.</h1>
        </div>
        <label className={`primary-action icon-action upload-button ${isProcessing ? 'is-busy' : ''}`}>
          {isProcessing ? <Loader2 aria-hidden="true" className="spin" /> : <UploadCloud aria-hidden="true" />}
          {isProcessing ? 'Reading image…' : 'Upload screenshot'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </header>

      {errorMessage ? (
        <p className="upload-error" role="alert">{errorMessage}</p>
      ) : null}

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
