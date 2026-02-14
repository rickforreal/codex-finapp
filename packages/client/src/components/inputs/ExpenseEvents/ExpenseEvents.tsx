import { useAppStore } from '../../../store/useAppStore';
import { ExpenseEventCard } from './ExpenseEventCard';

export const ExpenseEvents = () => {
  const events = useAppStore((state) => state.expenseEvents);
  const addExpenseEvent = useAppStore((state) => state.addExpenseEvent);
  const removeExpenseEvent = useAppStore((state) => state.removeExpenseEvent);
  const updateExpenseEvent = useAppStore((state) => state.updateExpenseEvent);

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <ExpenseEventCard
          key={event.id}
          event={event}
          onRemove={() => removeExpenseEvent(event.id)}
          onUpdate={(patch) => updateExpenseEvent(event.id, patch)}
        />
      ))}
      <button type="button" onClick={addExpenseEvent} className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy">
        Add Expense Event
      </button>
    </div>
  );
};
