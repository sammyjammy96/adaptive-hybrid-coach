import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
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

type Mode = 'view' | 'edit';

interface NumericInputs {
  age: string;
  heightCm: string;
  trainingAgeYears: string;
}

function profileToNumericInputs(p: AthleteProfile): NumericInputs {
  return {
    age: String(p.age),
    heightCm: String(p.heightCm),
    trainingAgeYears: String(p.trainingAgeYears)
  };
}

export function ProfileScreen({ profile, hasCustomizedProfile, onUpdate, onReset }: ProfileScreenProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState<AthleteProfile>(profile);
  const [numericInputs, setNumericInputs] = useState<NumericInputs>(profileToNumericInputs(profile));
  const [savedFlag, setSavedFlag] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(profile);
    setNumericInputs(profileToNumericInputs(profile));
    setNameError(null);
    setMode('view');
  }, [profile]);

  useEffect(() => {
    if (!savedFlag) return;
    const timeout = window.setTimeout(() => setSavedFlag(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedFlag]);

  function updateField<K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === 'name') setNameError(null);
  }

  function updateNumericInput<K extends keyof NumericInputs>(key: K, raw: string) {
    setNumericInputs((current) => ({ ...current, [key]: raw }));
  }

  function startEdit() {
    setDraft(profile);
    setNumericInputs(profileToNumericInputs(profile));
    setNameError(null);
    setMode('edit');
  }

  function cancelEdit() {
    setDraft(profile);
    setNumericInputs(profileToNumericInputs(profile));
    setNameError(null);
    setMode('view');
  }

  function handleSave() {
    if (draft.name.trim() === '') {
      setNameError('Name is required.');
      return;
    }
    const age = parseFloat(numericInputs.age);
    const heightCm = parseFloat(numericInputs.heightCm);
    const trainingAgeYears = parseFloat(numericInputs.trainingAgeYears);
    const next: AthleteProfile = {
      ...draft,
      age: Number.isFinite(age) ? age : profile.age,
      heightCm: Number.isFinite(heightCm) ? heightCm : profile.heightCm,
      trainingAgeYears: Number.isFinite(trainingAgeYears) ? trainingAgeYears : profile.trainingAgeYears
    };
    onUpdate(next);
    setSavedFlag(true);
    setMode('view');
  }

  function handleReset() {
    const confirmed = window.confirm(
      'This clears all your saved logs, approvals, plan changes, and profile edits. Continue?'
    );
    if (confirmed) {
      onReset();
    }
  }

  if (mode === 'view') {
    return (
      <ProfileView
        profile={profile}
        hasCustomizedProfile={hasCustomizedProfile}
        savedFlag={savedFlag}
        onEdit={startEdit}
        onReset={handleReset}
      />
    );
  }

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Edit profile</h1>
        </div>
        <div className="profile-edit-actions">
          <button type="button" className="secondary-action" onClick={cancelEdit}>
            Cancel
          </button>
          <button type="button" className="primary-action" onClick={handleSave}>
            Save profile
          </button>
        </div>
      </header>

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
            <div className="input-with-suffix">
              <input
                type="number"
                inputMode="numeric"
                min={14}
                max={100}
                value={numericInputs.age}
                onChange={(event) => updateNumericInput('age', event.target.value)}
              />
              <span>years</span>
            </div>
          </label>
          <label>
            Height
            <div className="input-with-suffix">
              <input
                type="number"
                inputMode="numeric"
                min={100}
                max={240}
                value={numericInputs.heightCm}
                onChange={(event) => updateNumericInput('heightCm', event.target.value)}
              />
              <span>cm</span>
            </div>
          </label>
          <label>
            Training age
            <div className="input-with-suffix">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={60}
                step={0.5}
                value={numericInputs.trainingAgeYears}
                onChange={(event) => updateNumericInput('trainingAgeYears', event.target.value)}
              />
              <span>years</span>
            </div>
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
      </form>
    </div>
  );
}

interface ProfileViewProps {
  profile: AthleteProfile;
  hasCustomizedProfile: boolean;
  savedFlag: boolean;
  onEdit: () => void;
  onReset: () => void;
}

function ProfileView({ profile, hasCustomizedProfile, savedFlag, onEdit, onReset }: ProfileViewProps) {
  const unitsLabel = profile.preferredUnits === 'metric' ? 'Metric' : 'Imperial';

  return (
    <div>
      <header className="screen-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{profile.name ? `${profile.name}'s training context.` : 'Your training context.'}</h1>
        </div>
        <div className="profile-edit-actions">
          <span className={`saved-flag ${savedFlag ? 'is-visible' : ''}`} aria-live="polite">
            Saved
          </span>
          <button type="button" className="primary-action icon-action" onClick={onEdit}>
            <Pencil aria-hidden="true" /> Edit profile
          </button>
        </div>
      </header>

      {!hasCustomizedProfile ? (
        <p className="demo-data-hint">Showing demo data — tap Edit profile to make this yours.</p>
      ) : null}

      <div className="grid two">
        <section className="profile-card">
          <h2>Goal</h2>
          <p>{profile.currentGoal || <em>No goal set</em>}</p>
          {profile.runningBaseline ? <p className="profile-card__muted">{profile.runningBaseline}</p> : null}
        </section>

        <section className="profile-card">
          <h2>Stats</h2>
          <div className="profile-list">
            <span><strong>Age</strong>{profile.age} years</span>
            <span><strong>Height</strong>{profile.heightCm} cm</span>
            <span><strong>Training age</strong>{profile.trainingAgeYears} {profile.trainingAgeYears === 1 ? 'year' : 'years'}</span>
            <span><strong>Units</strong>{unitsLabel}</span>
          </div>
        </section>

        <section className="profile-card">
          <h2>Availability</h2>
          <div className="profile-list">
            {profile.weeklyAvailability.map((window) => (
              <span key={window.day}>
                <strong>{window.day}</strong>
                {window.available ? `${window.minutes} min` : 'Rest'}
              </span>
            ))}
          </div>
        </section>

        <section className="profile-card">
          <h2>PRs</h2>
          {profile.prs.length === 0 ? (
            <p className="profile-card__muted">No PRs logged.</p>
          ) : (
            <div className="profile-list">
              {profile.prs.map((pr, index) => (
                <span key={`${pr.lift}-${index}`}>
                  <strong>{pr.lift}</strong>
                  {pr.value}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="profile-card">
          <h2>Injury flags</h2>
          {profile.injuryFlags.length === 0 ? (
            <p className="profile-card__muted">None.</p>
          ) : (
            <ul className="profile-flag-list">
              {profile.injuryFlags.map((flag, index) => (
                <li key={`${flag}-${index}`}>{flag}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile-card">
          <h2>Privacy mode</h2>
          <p>Prototype data stays in this browser. AI extraction and account sync require a secure backend later.</p>
        </section>
      </div>

      <div className="reset-row">
        <button type="button" className="destructive-action" onClick={onReset}>
          Reset prototype data
        </button>
      </div>
    </div>
  );
}
