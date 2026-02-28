import { NumericInput } from './NumericInput';

type Props = {
  value: { month: number; year: number };
  onChange: (value: { month: number; year: number }) => void;
  disabled?: boolean;
};

export const MonthYearPicker = ({ value, onChange, disabled = false }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumericInput
        value={value.month}
        onChange={(month) => onChange({ ...value, month })}
        min={1}
        max={12}
        disabled={disabled}
      />
      <NumericInput
        value={value.year}
        onChange={(year) => onChange({ ...value, year })}
        min={1900}
        max={3000}
        disabled={disabled}
      />
    </div>
  );
};
