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
    <div className={`theme-segmented-shell inline-grid grid-flow-col auto-cols-fr items-center rounded-full border p-0.5 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`theme-segmented-option rounded-full px-3 py-1 text-sm leading-5 transition ${
            option.value === value ? 'theme-segmented-option-active font-medium' : ''
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
