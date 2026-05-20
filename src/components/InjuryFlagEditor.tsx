import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const MAX_FLAGS = 12;

interface InjuryFlagEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function InjuryFlagEditor({ value, onChange }: InjuryFlagEditorProps) {
  const [draft, setDraft] = useState('');

  const atCap = value.length >= MAX_FLAGS;
  const canAdd = !atCap && draft.trim() !== '';

  function handleAdd() {
    if (!canAdd) return;
    onChange([...value, draft.trim()]);
    setDraft('');
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateFlag(index: number, raw: string) {
    onChange(value.map((flag, i) => (i === index ? raw : flag)));
  }

  return (
    <fieldset className="editor-fieldset">
      <legend>Injury flags</legend>
      {value.length === 0 ? (
        <p className="editor-empty">No injury flags.</p>
      ) : (
        <ul className="editor-list">
          {value.map((flag, index) => (
            <li key={index} className="editor-row flag-row">
              <label className="editor-row-field">
                <span className="visually-hidden">Injury flag</span>
                <input
                  type="text"
                  value={flag}
                  onChange={(event) => updateFlag(index, event.target.value)}
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${flag || 'flag'}`}
                onClick={() => handleRemove(index)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="editor-row editor-add flag-add">
        <label className="editor-add-field">
          <span className="visually-hidden">New injury flag</span>
          <input
            type="text"
            placeholder="e.g. Watch left calf"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={atCap}
          />
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label="Add injury flag"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
      {atCap ? <p className="editor-empty">Maximum {MAX_FLAGS} flags.</p> : null}
    </fieldset>
  );
}
