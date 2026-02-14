import { useAppStore } from '../../../store/useAppStore';
import { PhaseCard } from './PhaseCard';

export const SpendingPhases = () => {
  const phases = useAppStore((state) => state.spendingPhases);
  const addSpendingPhase = useAppStore((state) => state.addSpendingPhase);
  const removeSpendingPhase = useAppStore((state) => state.removeSpendingPhase);
  const updateSpendingPhase = useAppStore((state) => state.updateSpendingPhase);

  return (
    <div className="space-y-2">
      {phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          canRemove={phases.length > 1}
          lockStartYear={phase.id === phases[0]?.id}
          lockEndYear={phase.id === phases[phases.length - 1]?.id}
          onUpdate={(patch) => updateSpendingPhase(phase.id, patch)}
          onRemove={() => removeSpendingPhase(phase.id)}
        />
      ))}
      <button
        type="button"
        onClick={addSpendingPhase}
        disabled={phases.length >= 4}
        className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
      >
        Add Phase
      </button>
      <p className="text-xs text-slate-500">Maximum 4 phases.</p>
    </div>
  );
};
