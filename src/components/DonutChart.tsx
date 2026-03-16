"use client";

const COLORS = [
  '#00838f', '#00695c', '#2e7d32', '#f9a825', '#d32f2f',
  '#00acc1', '#7b1fa2', '#558b2f', '#ef6c00', '#1565c0',
];

type Segment = {
  label: string;
  value: number;
  color: string;
  percentage: number;
};

export function DonutChart({ data, title }: { data: Record<string, number>; title: string }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const segments: Segment[] = sorted.map(([label, value], i) => ({
    label,
    value,
    color: COLORS[i % COLORS.length],
    percentage: (value / total) * 100,
  }));

  // Build SVG donut using stroke-dasharray trick
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ marginBottom: 'var(--spacing-md)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', overflow: 'hidden' }}>
        {/* SVG Donut */}
        <svg width="90" height="90" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
          {segments.map((seg) => {
            const dashLength = (seg.percentage / 100) * circumference;
            const dashGap = circumference - dashLength;
            const currentOffset = offset;
            offset += dashLength;
            return (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={-currentOffset}
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
              />
            );
          })}
          <text x="50" y="50" textAnchor="middle" fill="var(--color-text-main)" fontSize="10" fontWeight="700">
            ${total.toFixed(0)}
          </text>
          <text x="50" y="60" textAnchor="middle" fill="var(--color-text-muted)" fontSize="6">
            total
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {segments.map((seg) => (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: seg.color, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-main)' }}>
                {seg.label}
              </span>
              <span style={{ fontWeight: 600, flexShrink: 0, color: 'var(--color-text-muted)', fontSize: '0.625rem' }}>
                {seg.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
