import { CurrencyInput } from '../../shared/CurrencyInput';
import { MonthYearPicker } from '../../shared/MonthYearPicker';
import { CompareSyncControl } from '../../shared/CompareSyncControl';
import { useAppStore, useCompareInstanceLockUiState } from '../../../store/useAppStore';
import type { SpendingPhaseForm } from '../../../store/useAppStore';
import { maxMonthYear, minMonthYear } from '../../../lib/dates';
import type { MonthYear } from '@finapp/shared';

type Props = {
  phase: SpendingPhaseForm;
  portfolioStart: MonthYear;
  portfolioEnd: MonthYear;
  canRemove: boolean;
  familyReadOnly: boolean;
  onUpdate: (patch: Partial<SpendingPhaseForm>) => void;
  onRemove: () => void;
};

export const PhaseCard = ({
  phase,
  portfolioStart,
  portfolioEnd,
  canRemove,
  familyReadOnly,
  onUpdate,
  onRemove,
}: Props) => {
  const instanceUi = useCompareInstanceLockUiState('spendingPhases', phase.id);
  const toggleLock = useAppStore((state) => state.toggleCompareInstanceLock);
  const setSlotInstanceSync = useAppStore((state) => state.setCompareSlotInstanceSync);
  const readOnly = familyReadOnly || instanceUi.readOnly;
  const clampToPortfolioBounds = (value: MonthYear): MonthYear =>
    minMonthYear(maxMonthYear(value, portfolioStart), portfolioEnd);

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
          aria-label="Delete spending phase"
          title="Delete phase"
          className="grid h-8 w-8 place-items-center rounded border border-brand-border text-[var(--theme-color-text-secondary)] disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16" />
            <path d="M9 7V5h6v2" />
            <path d="M8 7l1 12h6l1-12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">Start Date</p>
          <MonthYearPicker
            value={phase.start}
            onChange={(value) => {
              const bounded = clampToPortfolioBounds(value);
              const clampedStart = minMonthYear(bounded, phase.end);
              onUpdate({ start: clampedStart });
            }}
            disabled={readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">End Date</p>
          <MonthYearPicker
            value={phase.end}
            onChange={(value) => {
              const bounded = clampToPortfolioBounds(value);
              const clampedEnd = maxMonthYear(bounded, phase.start);
              onUpdate({ end: clampedEnd });
            }}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-slate-600">Min Monthly (Optional)</p>
          <CurrencyInput
            value={phase.minMonthlySpend}
            onChange={(value) => onUpdate({ minMonthlySpend: value })}
            disabled={readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-600">Max Monthly (Optional)</p>
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
