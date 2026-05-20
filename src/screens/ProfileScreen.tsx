import type { AthleteProfile } from '../domain/types';

interface ProfileScreenProps {
  profile: AthleteProfile;
  onReset: () => void;
}

export function ProfileScreen({ profile, onReset }: ProfileScreenProps) {
  function handleReset() {
    const confirmed = window.confirm(
      'This clears all your saved logs, approvals, and plan changes. Continue?'
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
          <h1>{profile.name}'s training context.</h1>
        </div>
      </header>
      <div className="grid two">
        <section className="profile-card">
          <h2>Goal</h2>
          <p>{profile.currentGoal}</p>
          <p>{profile.runningBaseline}</p>
        </section>
        <section className="profile-card">
          <h2>PRs</h2>
          <div className="profile-list">
            {profile.prs.map((pr) => (
              <span key={pr.lift}>
                <strong>{pr.lift}</strong>
                {pr.value}
              </span>
            ))}
          </div>
        </section>
        <section className="profile-card">
          <h2>Availability</h2>
          <div className="profile-list">
            {profile.weeklyAvailability.map((window) => (
              <span key={window.day}>
                <strong>{window.day}</strong>
                {window.available ? `${window.minutes} min` : 'Rest / unavailable'}
              </span>
            ))}
          </div>
        </section>
        <section className="profile-card">
          <h2>Privacy mode</h2>
          <p>Prototype data stays in this browser. AI extraction and account sync require a secure backend later.</p>
        </section>
      </div>
      <div className="reset-row">
        <button type="button" className="destructive-action" onClick={handleReset}>
          Reset prototype data
        </button>
      </div>
    </div>
  );
}
