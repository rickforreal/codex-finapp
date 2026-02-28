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
      className={`theme-input-control h-8 w-full rounded border px-2 text-sm disabled:cursor-not-allowed ${className}`}
    />
  );
};
