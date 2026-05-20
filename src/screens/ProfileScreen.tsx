import { useEffect, useState } from 'react';
import type { AthleteProfile } from '../domain/types';
import { AvailabilityEditor } from '../components/AvailabilityEditor';
import { InjuryFlagEditor } from '../components/InjuryFlagEditor';
import { PrEditor } from '../components/PrEditor';

interface ProfileScreenProps {
  profile: AthleteProfile;
  hasCustomizedProfile: boolean;
  onUpdate: (profile: AthleteProfile) => void;
  onReset: () => void;
}

export function ProfileScreen({ profile, hasCustomizedProfile, onUpdate, onReset }: ProfileScreenProps) {
  const [draft, setDraft] = useState<AthleteProfile>(profile);
  const [savedFlag, setSavedFlag] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(profile);
    setNameError(null);
  }, [profile]);

  useEffect(() => {
    if (!savedFlag) return;
    const timeout = window.setTimeout(() => setSavedFlag(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedFlag]);

  const isDirty = draft !== profile && !shallowEqualProfile(draft, profile);

  function updateField<K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === 'name') setNameError(null);
  }

  function handleSave() {
    if (draft.name.trim() === '') {
      setNameError('Name is required.');
      return;
    }
    onUpdate(draft);
    setSavedFlag(true);
  }

  function handleReset() {
    const confirmed = window.confirm(
      'This clears all your saved logs, approvals, plan changes, and profile edits. Continue?'
    );
    if (confirmed) {
      onReset();
    }
  }

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{draft.name ? `${draft.name}'s training context.` : 'Your training context.'}</h1>
        </div>
      </header>

      {!hasCustomizedProfile ? (
        <p className="demo-data-hint">Showing demo data — edit any field to make this yours.</p>
      ) : null}

      <form className="panel profile-form" onSubmit={(event) => event.preventDefault()}>
        <div className="grid two">
          <label>
            Name
            <input
              type="text"
              required
              value={draft.name}
              onChange={(event) => updateField('name', event.target.value)}
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? 'profile-name-error' : undefined}
            />
            {nameError ? <span id="profile-name-error" className="field-error">{nameError}</span> : null}
          </label>
          <label>
            Age
            <input
              type="number"
              min={14}
              max={100}
              value={draft.age}
              onChange={(event) => updateField('age', Number(event.target.value))}
            />
          </label>
          <label>
            Height (cm)
            <input
              type="number"
              min={100}
              max={240}
              value={draft.heightCm}
              onChange={(event) => updateField('heightCm', Number(event.target.value))}
            />
          </label>
          <label>
            Training age (years)
            <input
              type="number"
              min={0}
              max={60}
              step={0.5}
              value={draft.trainingAgeYears}
              onChange={(event) => updateField('trainingAgeYears', Number(event.target.value))}
            />
          </label>
        </div>

        <label>
          Running baseline
          <textarea
            rows={2}
            value={draft.runningBaseline}
            onChange={(event) => updateField('runningBaseline', event.target.value)}
          />
        </label>

        <label>
          Current goal
          <textarea
            rows={2}
            value={draft.currentGoal}
            onChange={(event) => updateField('currentGoal', event.target.value)}
          />
        </label>

        <fieldset className="units-fieldset">
          <legend>Preferred units</legend>
          <label className="radio-row">
            <input
              type="radio"
              name="preferredUnits"
              value="metric"
              checked={draft.preferredUnits === 'metric'}
              onChange={() => updateField('preferredUnits', 'metric')}
            />
            Metric
          </label>
          <label className="radio-row">
            <input
              type="radio"
              name="preferredUnits"
              value="imperial"
              checked={draft.preferredUnits === 'imperial'}
              onChange={() => updateField('preferredUnits', 'imperial')}
            />
            Imperial
          </label>
        </fieldset>

        <AvailabilityEditor
          value={draft.weeklyAvailability}
          onChange={(next) => updateField('weeklyAvailability', next)}
        />
        <PrEditor
          value={draft.prs}
          onChange={(next) => updateField('prs', next)}
        />
        <InjuryFlagEditor
          value={draft.injuryFlags}
          onChange={(next) => updateField('injuryFlags', next)}
        />

        <div className="log-actions">
          <button
            type="button"
            className="primary-action"
            onClick={handleSave}
            disabled={!isDirty}
          >
            Save profile
          </button>
          <span className={`saved-flag ${savedFlag ? 'is-visible' : ''}`} aria-live="polite">
            Saved
          </span>
        </div>
      </form>

      <section className="profile-card">
        <h2>Privacy mode</h2>
        <p>Prototype data stays in this browser. AI extraction and account sync require a secure backend later.</p>
      </section>

      <div className="reset-row">
        <button type="button" className="destructive-action" onClick={handleReset}>
          Reset prototype data
        </button>
      </div>
    </div>
  );
}

function shallowEqualProfile(a: AthleteProfile, b: AthleteProfile): boolean {
  return (
    a.name === b.name &&
    a.age === b.age &&
    a.heightCm === b.heightCm &&
    a.trainingAgeYears === b.trainingAgeYears &&
    a.runningBaseline === b.runningBaseline &&
    a.currentGoal === b.currentGoal &&
    a.preferredUnits === b.preferredUnits &&
    JSON.stringify(a.prs) === JSON.stringify(b.prs) &&
    JSON.stringify(a.injuryFlags) === JSON.stringify(b.injuryFlags) &&
    JSON.stringify(a.weeklyAvailability) === JSON.stringify(b.weeklyAvailability)
  );
}
