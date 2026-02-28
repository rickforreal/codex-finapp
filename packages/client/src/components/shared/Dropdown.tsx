type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export const Dropdown = <T extends string>({ value, options, onChange, disabled = false }: Props<T>) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value as T)}
    disabled={disabled}
    className="h-9 w-full rounded border border-brand-border bg-white px-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
