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
    className="theme-input-control h-9 w-full rounded border px-2 text-sm disabled:cursor-not-allowed"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
