interface LoadBalanceProps {
  crossfitSessions: number;
  runSessions: number;
  hardSessions: number;
  label: string;
}

export function LoadBalance({ crossfitSessions, runSessions, hardSessions, label }: LoadBalanceProps) {
  const total = Math.max(1, crossfitSessions + runSessions);
  const crossfitPercent = Math.round((crossfitSessions / total) * 100);
  const runPercent = 100 - crossfitPercent;

  return (
    <section className="load-balance">
      <div className="section-heading">
        <p className="eyebrow">Weekly balance</p>
        <h2>{label}</h2>
      </div>
      <div className="load-bar" aria-label={`CrossFit ${crossfitPercent} percent, running ${runPercent} percent`}>
        <span style={{ width: `${crossfitPercent}%` }} />
        <span style={{ width: `${runPercent}%` }} />
      </div>
      <div className="load-balance__stats">
        <span>{crossfitSessions} CrossFit</span>
        <span>{runSessions} runs</span>
        <span>{hardSessions} hard</span>
      </div>
    </section>
  );
}
