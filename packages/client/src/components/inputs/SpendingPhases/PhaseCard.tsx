import { CurrencyInput } from '../../shared/CurrencyInput';
import { MonthYearPicker } from '../../shared/MonthYearPicker';
import { CompareSyncControl } from '../../shared/CompareSyncControl';
import { useAppStore, useCompareInstanceLockUiState } from '../../../store/useAppStore';
import type { SpendingPhaseForm } from '../../../store/useAppStore';

type Props = {
  phase: SpendingPhaseForm;
  canRemove: boolean;
  lockStart: boolean;
  lockEnd: boolean;
  familyReadOnly: boolean;
  onUpdate: (patch: Partial<SpendingPhaseForm>) => void;
  onRemove: () => void;
};

export const PhaseCard = ({
  phase,
  canRemove,
  lockStart,
  lockEnd,
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
          <p className="mb-1 text-xs text-slate-600">Start Date</p>
          <MonthYearPicker
            value={phase.start}
            onChange={(value) => onUpdate({ start: value })}
            disabled={lockStart || readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">End Date</p>
          <MonthYearPicker
            value={phase.end}
            onChange={(value) => onUpdate({ end: value })}
            disabled={lockEnd || readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">Min Monthly (Optional)</p>
          <CurrencyInput
            value={phase.minMonthlySpend ?? 0}
            onChange={(value) => onUpdate({ minMonthlySpend: value || undefined })}
            disabled={readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">Max Monthly (Optional)</p>
          <CurrencyInput
            value={phase.maxMonthlySpend ?? 0}
            onChange={(value) => onUpdate({ maxMonthlySpend: value || undefined })}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
};
