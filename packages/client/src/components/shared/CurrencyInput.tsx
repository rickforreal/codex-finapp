import { NumericInput } from './NumericInput';

type Props = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export const CurrencyInput = ({ value, onChange, className = '' }: Props) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm text-slate-500">$</span>
      <NumericInput value={value} onChange={(next) => onChange(Math.max(0, Math.round(next)))} min={0} />
    </div>
  );
};
