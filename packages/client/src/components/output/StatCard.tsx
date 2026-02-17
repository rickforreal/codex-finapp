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
  <article className={`min-h-[84px] min-w-[140px] rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
    <p className="text-[11px] uppercase tracking-[0.5px] text-slate-500">{label}</p>
    <p className={`mt-2 font-mono text-[22px] font-semibold leading-none text-slate-800 ${valueClassName}`}>{value}</p>
    {annotation ? (
      <p className={`mt-2 text-[10px] text-slate-500 ${annotationClassName}`} style={annotationStyle}>
        {annotation}
      </p>
    ) : null}
  </article>
);
