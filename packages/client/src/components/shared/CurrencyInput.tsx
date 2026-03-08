import { NumericInput } from './NumericInput';

type Props = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

export const CurrencyInput = ({
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder,
}: Props) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="theme-input-affix text-sm">$</span>
      <NumericInput
        value={value}
        onChange={(next) => onChange(next !== undefined ? Math.max(0, Math.round(next)) : undefined)}
        min={0}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
};
