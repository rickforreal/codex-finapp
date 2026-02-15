import { NumericInput } from './NumericInput';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

export const PercentInput = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  disabled = false,
}: Props) => {
  return (
    <div className="flex items-center gap-1">
      <NumericInput
        value={Number((value * 100).toFixed(2))}
        onChange={(next) => onChange(next / 100)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
      <span className="text-sm text-slate-500">%</span>
    </div>
  );
};
