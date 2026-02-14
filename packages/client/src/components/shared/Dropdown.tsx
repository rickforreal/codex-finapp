type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export const Dropdown = <T extends string>({ value, options, onChange }: Props<T>) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value as T)}
    className="h-9 w-full rounded border border-brand-border bg-white px-2 text-sm"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
