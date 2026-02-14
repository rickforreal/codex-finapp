import { useAppStore } from '../../../store/useAppStore';
import { IncomeEventCard } from './IncomeEventCard';

export const IncomeEvents = () => {
  const events = useAppStore((state) => state.incomeEvents);
  const addIncomeEvent = useAppStore((state) => state.addIncomeEvent);
  const removeIncomeEvent = useAppStore((state) => state.removeIncomeEvent);
  const updateIncomeEvent = useAppStore((state) => state.updateIncomeEvent);

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <IncomeEventCard
          key={event.id}
          event={event}
          onRemove={() => removeIncomeEvent(event.id)}
          onUpdate={(patch) => updateIncomeEvent(event.id, patch)}
        />
      ))}
      <button type="button" onClick={addIncomeEvent} className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy">
        Add Income Event
      </button>
    </div>
  );
};
