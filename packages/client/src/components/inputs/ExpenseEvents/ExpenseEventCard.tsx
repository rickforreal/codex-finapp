import { AssetClass } from '@finapp/shared';

import { CurrencyInput } from '../../shared/CurrencyInput';
import { Dropdown } from '../../shared/Dropdown';
import { MonthYearPicker } from '../../shared/MonthYearPicker';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
import type { ExpenseEventForm } from '../../../store/useAppStore';

type Props = {
  event: ExpenseEventForm;
  onUpdate: (patch: Partial<ExpenseEventForm>) => void;
  onRemove: () => void;
};

export const ExpenseEventCard = ({ event, onUpdate, onRemove }: Props) => {
  return (
    <div className="space-y-2 rounded-md border border-brand-border p-2">
      <div className="flex items-center gap-2">
        <input
          value={event.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="h-8 flex-1 rounded border border-brand-border px-2 text-sm"
        />
        <button type="button" onClick={onRemove} className="rounded border border-brand-border px-2 text-xs">Remove</button>
      </div>

      <CurrencyInput value={event.amount} onChange={(value) => onUpdate({ amount: value })} />

      <Dropdown
        value={event.sourceFrom}
        onChange={(value) => onUpdate({ sourceFrom: value as ExpenseEventForm['sourceFrom'] })}
        options={[
          { label: 'Follow Drawdown', value: 'follow-drawdown' },
          { label: 'Stocks', value: AssetClass.Stocks },
          { label: 'Bonds', value: AssetClass.Bonds },
          { label: 'Cash', value: AssetClass.Cash },
        ]}
      />

      <MonthYearPicker value={event.start} onChange={(value) => onUpdate({ start: value })} />

      <Dropdown
        value={event.frequency}
        onChange={(value) => onUpdate({ frequency: value as ExpenseEventForm['frequency'] })}
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Annual', value: 'annual' },
          { label: 'One-Time', value: 'oneTime' },
        ]}
      />

      <ToggleSwitch checked={event.inflationAdjusted} onChange={(checked) => onUpdate({ inflationAdjusted: checked })} label="Inflation adjusted" />
    </div>
  );
};
