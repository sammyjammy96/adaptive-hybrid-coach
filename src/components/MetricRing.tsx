import type { CSSProperties } from 'react';

interface MetricRingProps {
  label: string;
  value: number;
}

export function MetricRing({ label, value }: MetricRingProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className="metric-ring"
      style={{ '--ring-value': `${normalized}%` } as CSSProperties}
      aria-label={`${label}: ${normalized} out of 100`}
    >
      <div>
        <strong>{normalized}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
