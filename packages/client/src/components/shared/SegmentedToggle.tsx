type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export const SegmentedToggle = <T extends string>({ value, options, onChange, className = '' }: Props<T>) => {
  return (
    <div className={`inline-flex rounded-full border border-brand-border bg-white p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 text-sm transition ${
            option.value === value ? 'bg-brand-navy font-medium text-white' : 'text-slate-600 hover:bg-brand-surface'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
