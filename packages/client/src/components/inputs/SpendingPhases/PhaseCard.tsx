import { CurrencyInput } from '../../shared/CurrencyInput';
import { NumericInput } from '../../shared/NumericInput';
import { CompareSyncControl } from '../../shared/CompareSyncControl';
import { useAppStore, useCompareInstanceLockUiState } from '../../../store/useAppStore';
import type { SpendingPhaseForm } from '../../../store/useAppStore';

type Props = {
  phase: SpendingPhaseForm;
  canRemove: boolean;
  lockStartYear: boolean;
  lockEndYear: boolean;
  familyReadOnly: boolean;
  onUpdate: (patch: Partial<SpendingPhaseForm>) => void;
  onRemove: () => void;
};

export const PhaseCard = ({
  phase,
  canRemove,
  lockStartYear,
  lockEndYear,
  familyReadOnly,
  onUpdate,
  onRemove,
}: Props) => {
  const instanceUi = useCompareInstanceLockUiState('spendingPhases', phase.id);
  const toggleLock = useAppStore((state) => state.toggleCompareInstanceLock);
  const setSlotInstanceSync = useAppStore((state) => state.setCompareSlotInstanceSync);
  const readOnly = familyReadOnly || instanceUi.readOnly;

  return (
    <div className="space-y-2 rounded-md border border-brand-border bg-brand-surface p-2">
      <div className="flex items-center gap-2">
        <input
          value={phase.name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          disabled={readOnly}
          className="h-8 flex-1 rounded border border-brand-border px-2 text-sm"
        />
        <CompareSyncControl
          slotId={instanceUi.slotId}
          locked={instanceUi.instanceLocked}
          synced={instanceUi.instanceSynced}
          onToggleLock={() => toggleLock('spendingPhases', phase.id)}
          onToggleSync={(synced) => setSlotInstanceSync(instanceUi.slotId, 'spendingPhases', phase.id, synced)}
          lockToggleDisabled={!instanceUi.canToggleLock}
          lockToggleDisabledReason={instanceUi.lockDisabledReason}
          compact
        />
        <button
          type="button"
          disabled={!canRemove || readOnly}
          onClick={onRemove}
          className="h-8 rounded border border-brand-border px-2 text-xs disabled:opacity-40"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">Start Year</p>
          <NumericInput
            value={phase.startYear}
            onChange={(value) => onUpdate({ startYear: value })}
            min={1}
            max={100}
            disabled={lockStartYear || readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">End Year</p>
          <NumericInput
            value={phase.endYear}
            onChange={(value) => onUpdate({ endYear: value })}
            min={1}
            max={100}
            disabled={lockEndYear || readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">Min Monthly</p>
          <CurrencyInput
            value={phase.minMonthlySpend}
            onChange={(value) => onUpdate({ minMonthlySpend: value })}
            disabled={readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">Max Monthly</p>
          <CurrencyInput
            value={phase.maxMonthlySpend}
            onChange={(value) => onUpdate({ maxMonthlySpend: value })}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
};
