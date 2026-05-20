import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PersonalRecord } from '../domain/types';

const MAX_PRS = 12;

interface PrEditorProps {
  value: PersonalRecord[];
  onChange: (next: PersonalRecord[]) => void;
}

export function PrEditor({ value, onChange }: PrEditorProps) {
  const [lift, setLift] = useState('');
  const [recordValue, setRecordValue] = useState('');

  const atCap = value.length >= MAX_PRS;
  const canAdd = !atCap && lift.trim() !== '' && recordValue.trim() !== '';

  function handleAdd() {
    if (!canAdd) return;
    onChange([...value, { lift: lift.trim(), value: recordValue.trim() }]);
    setLift('');
    setRecordValue('');
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="editor-fieldset">
      <legend>Personal records</legend>
      {value.length === 0 ? (
        <p className="editor-empty">No PRs yet — add one below.</p>
      ) : (
        <ul className="editor-list">
          {value.map((pr, index) => (
            <li key={`${pr.lift}-${index}`} className="editor-row pr-row">
              <span className="pr-lift">{pr.lift}</span>
              <span className="pr-value">{pr.value}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${pr.lift}`}
                onClick={() => handleRemove(index)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="editor-row editor-add">
        <label className="editor-add-field">
          <span className="visually-hidden">Lift name</span>
          <input
            type="text"
            placeholder="Lift (e.g. Back squat)"
            value={lift}
            onChange={(event) => setLift(event.target.value)}
            disabled={atCap}
          />
        </label>
        <label className="editor-add-field">
          <span className="visually-hidden">Lift value</span>
          <input
            type="text"
            placeholder="Value (e.g. 150 kg)"
            value={recordValue}
            onChange={(event) => setRecordValue(event.target.value)}
            disabled={atCap}
          />
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label="Add PR"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
      {atCap ? <p className="editor-empty">Maximum {MAX_PRS} PRs.</p> : null}
    </fieldset>
  );
}
