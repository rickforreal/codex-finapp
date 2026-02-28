import { AssetClass } from '@finapp/shared';

import { CurrencyInput } from '../../shared/CurrencyInput';
import { CompareSyncControl } from '../../shared/CompareSyncControl';
import { Dropdown } from '../../shared/Dropdown';
import { MonthYearPicker } from '../../shared/MonthYearPicker';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
import {
  useAppStore,
  useCompareInstanceLockUiState,
  type ExpenseEventForm,
} from '../../../store/useAppStore';

type Props = {
  event: ExpenseEventForm;
  familyReadOnly: boolean;
  onUpdate: (patch: Partial<ExpenseEventForm>) => void;
  onRemove: () => void;
};

export const ExpenseEventCard = ({ event, familyReadOnly, onUpdate, onRemove }: Props) => {
  const endIsRetirement = event.end === 'endOfRetirement';
  const instanceUi = useCompareInstanceLockUiState('expenseEvents', event.id);
  const toggleLock = useAppStore((state) => state.toggleCompareInstanceLock);
  const setSlotInstanceSync = useAppStore((state) => state.setCompareSlotInstanceSync);
  const readOnly = familyReadOnly || instanceUi.readOnly;

  return (
    <div className="space-y-2 rounded-md border border-brand-border p-3">
      <div className="flex items-center gap-2">
        <input
          value={event.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          disabled={readOnly}
          className="h-8 flex-1 rounded border border-brand-border px-2 text-sm"
        />
        <CompareSyncControl
          slotId={instanceUi.slotId}
          locked={instanceUi.instanceLocked}
          synced={instanceUi.instanceSynced}
          onToggleLock={() => toggleLock('expenseEvents', event.id)}
          onToggleSync={(synced) => setSlotInstanceSync(instanceUi.slotId, 'expenseEvents', event.id, synced)}
          compact
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={readOnly}
          className="rounded border border-brand-border px-2 text-xs disabled:opacity-40"
        >
          Remove
        </button>
      </div>

      <CurrencyInput value={event.amount} onChange={(value) => onUpdate({ amount: value })} disabled={readOnly} />

      <Dropdown
        value={event.sourceFrom}
        onChange={(value) => onUpdate({ sourceFrom: value as ExpenseEventForm['sourceFrom'] })}
        disabled={readOnly}
        options={[
          { label: 'Follow Drawdown', value: 'follow-drawdown' },
          { label: 'Stocks', value: AssetClass.Stocks },
          { label: 'Bonds', value: AssetClass.Bonds },
          { label: 'Cash', value: AssetClass.Cash },
        ]}
      />

      <MonthYearPicker value={event.start} onChange={(value) => onUpdate({ start: value })} disabled={readOnly} />

      <Dropdown
        value={event.frequency}
        onChange={(value) => onUpdate({ frequency: value as ExpenseEventForm['frequency'] })}
        disabled={readOnly}
        options={[
          { label: 'Monthly', value: 'monthly' },
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
            disabled={readOnly}
          />
        )}
        <button
          type="button"
          onClick={() => onUpdate({ end: endIsRetirement ? event.start : 'endOfRetirement' })}
          disabled={readOnly}
          className="text-xs text-brand-navy underline disabled:opacity-40"
        >
          {endIsRetirement ? 'Use Specific End Date' : 'Set to End of Retirement'}
        </button>
      </div>

      <ToggleSwitch
        checked={event.inflationAdjusted}
        onChange={(checked) => onUpdate({ inflationAdjusted: checked })}
        label="Inflation adjusted"
        disabled={readOnly}
      />
    </div>
  );
};
