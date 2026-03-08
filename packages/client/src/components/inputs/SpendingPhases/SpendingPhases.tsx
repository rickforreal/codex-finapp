import { useAppStore, useCompareFamilyLockUiState } from '../../../store/useAppStore';
import { PhaseCard } from './PhaseCard';

export const SpendingPhases = () => {
  const phases = useAppStore((state) => state.spendingPhases);
  const addSpendingPhase = useAppStore((state) => state.addSpendingPhase);
  const removeSpendingPhase = useAppStore((state) => state.removeSpendingPhase);
  const updateSpendingPhase = useAppStore((state) => state.updateSpendingPhase);
  const familyLockState = useCompareFamilyLockUiState('spendingPhases');

  return (
    <div className="space-y-2">
      {phases.length === 0 ? (
        <div className="space-y-3 rounded-md border border-dashed border-brand-border bg-brand-surface p-3">
          <p className="text-xs text-slate-600">
            No spending phases are active. This portfolio is currently accumulation-only with no monthly withdrawals.
          </p>
          <button
            type="button"
            onClick={addSpendingPhase}
            disabled={familyLockState.readOnly}
            className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
          >
            Add Phase
          </button>
          <p className="text-xs text-slate-500">Optional, up to 4 phases.</p>
        </div>
      ) : (
        <>
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              canRemove={!familyLockState.readOnly}
              familyReadOnly={familyLockState.readOnly}
              onUpdate={(patch) => updateSpendingPhase(phase.id, patch)}
              onRemove={() => removeSpendingPhase(phase.id)}
            />
          ))}
          <button
            type="button"
            onClick={addSpendingPhase}
            disabled={phases.length >= 4 || familyLockState.readOnly}
            className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
          >
            Add Phase
          </button>
          <p className="text-xs text-slate-500">Maximum 4 phases.</p>
        </>
      )}
    </div>
  );
};
