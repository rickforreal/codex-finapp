import { useAppStore, useCompareFamilyLockUiState } from '../../../store/useAppStore';
import { IncomeEventCard } from './IncomeEventCard';

export const IncomeEvents = () => {
  const events = useAppStore((state) => state.incomeEvents);
  const addIncomeEvent = useAppStore((state) => state.addIncomeEvent);
  const removeIncomeEvent = useAppStore((state) => state.removeIncomeEvent);
  const updateIncomeEvent = useAppStore((state) => state.updateIncomeEvent);
  const familyLockState = useCompareFamilyLockUiState('incomeEvents');

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <IncomeEventCard
          key={event.id}
          event={event}
          familyReadOnly={familyLockState.readOnly}
          onRemove={() => removeIncomeEvent(event.id)}
          onUpdate={(patch) => updateIncomeEvent(event.id, patch)}
        />
      ))}
      <button
        type="button"
        onClick={() => addIncomeEvent()}
        disabled={familyLockState.readOnly}
        className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
      >
        Add Income Event
      </button>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => addIncomeEvent('socialSecurity')}
          disabled={familyLockState.readOnly}
          className="rounded border border-brand-border py-1 text-xs"
        >
          + Social Security
        </button>
        <button
          type="button"
          onClick={() => addIncomeEvent('pension')}
          disabled={familyLockState.readOnly}
          className="rounded border border-brand-border py-1 text-xs"
        >
          + Pension
        </button>
        <button
          type="button"
          onClick={() => addIncomeEvent('rentalIncome')}
          disabled={familyLockState.readOnly}
          className="rounded border border-brand-border py-1 text-xs"
        >
          + Rental
        </button>
      </div>
    </div>
  );
};
