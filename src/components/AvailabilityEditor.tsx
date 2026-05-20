import type { AvailabilityWindow } from '../domain/types';

interface AvailabilityEditorProps {
  value: AvailabilityWindow[];
  onChange: (next: AvailabilityWindow[]) => void;
}

export function AvailabilityEditor({ value, onChange }: AvailabilityEditorProps) {
  function setDay(index: number, patch: Partial<AvailabilityWindow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="editor-fieldset">
      <legend>Weekly availability</legend>
      <ul className="editor-list">
        {value.map((row, index) => (
          <li key={row.day} className="editor-row availability-row">
            <span className="availability-day">{row.day}</span>
            <label className="availability-toggle">
              <input
                type="checkbox"
                checked={row.available}
                onChange={(event) =>
                  setDay(index, {
                    available: event.target.checked,
                    minutes: event.target.checked ? row.minutes || 30 : 0
                  })
                }
              />
              Available
            </label>
            <label className="availability-minutes">
              <span className="visually-hidden">{row.day} minutes</span>
              <input
                type="number"
                min={0}
                max={240}
                value={row.available ? row.minutes : 0}
                disabled={!row.available}
                placeholder={row.available ? '' : 'Rest'}
                onChange={(event) => setDay(index, { minutes: Number(event.target.value) })}
              />
              <span>min</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
