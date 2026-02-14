import type { ChangeEvent } from 'react';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
};

export const NumericInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
  disabled = false,
}: Props) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) {
      return;
    }
    onChange(next);
  };

  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      disabled={disabled}
      className={`h-8 w-full rounded border border-brand-border bg-white px-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
    />
  );
};
