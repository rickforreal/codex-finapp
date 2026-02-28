import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  annotation?: ReactNode;
  valueClassName?: string;
  annotationClassName?: string;
  annotationStyle?: CSSProperties;
  className?: string;
};

export const StatCard = ({
  label,
  value,
  annotation,
  valueClassName = '',
  annotationClassName = '',
  annotationStyle,
  className = '',
}: Props) => (
  <article className={`theme-summary-stat-card min-h-[84px] min-w-[140px] rounded-lg border p-3 shadow-sm ${className}`}>
    <p className="theme-summary-stat-label text-[11px] uppercase tracking-[0.5px]">{label}</p>
    <p className={`theme-summary-stat-value mt-2 font-mono text-[22px] font-semibold leading-none ${valueClassName}`}>{value}</p>
    {annotation ? (
      <p className={`theme-summary-stat-annotation mt-2 text-[10px] ${annotationClassName}`} style={annotationStyle}>
        {annotation}
      </p>
    ) : null}
  </article>
);
