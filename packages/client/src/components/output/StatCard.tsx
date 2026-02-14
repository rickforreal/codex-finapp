type Props = {
  label: string;
  value: string;
  annotation?: string;
  valueClassName?: string;
  className?: string;
};

export const StatCard = ({ label, value, annotation, valueClassName = '', className = '' }: Props) => (
  <article className={`min-h-[84px] min-w-[140px] rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
    <p className="text-[11px] uppercase tracking-[0.5px] text-slate-500">{label}</p>
    <p className={`mt-2 font-mono text-[22px] font-semibold leading-none text-slate-800 ${valueClassName}`}>{value}</p>
    {annotation ? <p className="mt-2 text-[10px] text-slate-500">{annotation}</p> : null}
  </article>
);
