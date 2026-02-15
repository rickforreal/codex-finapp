import { AssetClass } from '@finapp/shared';

import { CurrencyInput } from '../../shared/CurrencyInput';
import { Dropdown } from '../../shared/Dropdown';
import { MonthYearPicker } from '../../shared/MonthYearPicker';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
import type { IncomeEventForm } from '../../../store/useAppStore';

type Props = {
  event: IncomeEventForm;
  onUpdate: (patch: Partial<IncomeEventForm>) => void;
  onRemove: () => void;
};

export const IncomeEventCard = ({ event, onUpdate, onRemove }: Props) => {
  const endIsRetirement = event.end === 'endOfRetirement';

  return (
    <div className="space-y-2 rounded-md border border-brand-border p-3">
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
        value={event.depositTo}
        onChange={(value) => onUpdate({ depositTo: value as IncomeEventForm['depositTo'] })}
        options={[
          { label: 'Stocks', value: AssetClass.Stocks },
          { label: 'Bonds', value: AssetClass.Bonds },
          { label: 'Cash', value: AssetClass.Cash },
        ]}
      />

      <MonthYearPicker value={event.start} onChange={(value) => onUpdate({ start: value })} />

      <Dropdown
        value={event.frequency}
        onChange={(value) => onUpdate({ frequency: value as IncomeEventForm['frequency'] })}
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
          { label: 'Annual', value: 'annual' },
          { label: 'One-Time', value: 'oneTime' },
        ]}
      />

      <div className="space-y-1">
        {endIsRetirement ? (
          <p className="rounded border border-brand-border bg-slate-50 px-2 py-2 text-xs text-slate-600">
            End Date: End of Retirement
          </p>
        ) : (
          <MonthYearPicker
            value={event.end === 'endOfRetirement' ? event.start : event.end}
            onChange={(value) => onUpdate({ end: value })}
          />
        )}
        <button
          type="button"
          onClick={() => onUpdate({ end: endIsRetirement ? event.start : 'endOfRetirement' })}
          className="text-xs text-brand-navy underline"
        >
          {endIsRetirement ? 'Use Specific End Date' : 'Set to End of Retirement'}
        </button>
      </div>

      <ToggleSwitch checked={event.inflationAdjusted} onChange={(checked) => onUpdate({ inflationAdjusted: checked })} label="Inflation adjusted" />
    </div>
  );
};
