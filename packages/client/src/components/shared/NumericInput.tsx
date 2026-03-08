import type { ChangeEvent } from 'react';

type Props = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

export const NumericInput = ({
  value,
  onChange,
  onBlur,
  min,
  max,
  step = 1,
  className = '',
  disabled = false,
  placeholder,
}: Props) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === '') {
      onChange(undefined);
      return;
    }
    const next = Number(event.target.value);
    if (Number.isNaN(next)) {
      return;
    }
    onChange(next);
  };

  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={`theme-input-control h-8 w-full rounded border px-2 text-sm disabled:cursor-not-allowed ${className}`}
    />
  );
};
