import { useEffect, useState } from 'react';

import { NumericInput } from './NumericInput';

type Props = {
  value: { month: number; year: number };
  onChange: (value: { month: number; year: number }) => void;
  disabled?: boolean;
};

export const MonthYearPicker = ({ value, onChange, disabled = false }: Props) => {
  const [draftMonth, setDraftMonth] = useState<number | undefined>(value.month);
  const [draftYear, setDraftYear] = useState<number | undefined>(value.year);

  useEffect(() => {
    setDraftMonth(value.month);
  }, [value.month]);

  useEffect(() => {
    setDraftYear(value.year);
  }, [value.year]);

  const commitMonth = () => {
    if (draftMonth === undefined || Number.isNaN(draftMonth)) {
      setDraftMonth(value.month);
      return;
    }
    const month = Math.max(1, Math.min(12, Math.round(draftMonth)));
    if (month !== value.month) {
      onChange({ ...value, month });
    }
    // Always reset to the current committed value; parent may clamp/reject.
    setDraftMonth(value.month);
  };

  const commitYear = () => {
    if (draftYear === undefined || Number.isNaN(draftYear)) {
      setDraftYear(value.year);
      return;
    }
    const year = Math.max(1900, Math.min(3000, Math.round(draftYear)));
    if (year !== value.year) {
      onChange({ ...value, year });
    }
    // Always reset to the current committed value; parent may clamp/reject.
    setDraftYear(value.year);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <NumericInput
        value={draftMonth}
        onChange={setDraftMonth}
        onBlur={commitMonth}
        min={1}
        max={12}
        disabled={disabled}
      />
      <NumericInput
        value={draftYear}
        onChange={setDraftYear}
        onBlur={commitYear}
        min={1900}
        max={3000}
        disabled={disabled}
      />
    </div>
  );
};
