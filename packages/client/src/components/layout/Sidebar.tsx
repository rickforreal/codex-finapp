import { AppMode, SimulationMode } from '@finapp/shared';

import { CoreParameters } from '../inputs/CoreParameters';
import { StartingPortfolio } from '../inputs/StartingPortfolio';
import { ReturnAssumptions } from '../inputs/ReturnAssumptions';
import { HistoricalDataSummary } from '../inputs/HistoricalDataSummary';
import { SpendingPhases } from '../inputs/SpendingPhases/SpendingPhases';
import { WithdrawalStrategySection } from '../inputs/WithdrawalStrategy/WithdrawalStrategy';
import { DrawdownStrategySection } from '../inputs/DrawdownStrategy/DrawdownStrategy';
import { IncomeEvents } from '../inputs/IncomeEvents/IncomeEvents';
import { ExpenseEvents } from '../inputs/ExpenseEvents/ExpenseEvents';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { useAppStore } from '../../store/useAppStore';

const sectionIds = {
  core: 'core',
  portfolio: 'portfolio',
  returns: 'returns',
  phases: 'phases',
  withdrawal: 'withdrawal',
  drawdown: 'drawdown',
  income: 'income',
  expense: 'expense',
};

export const Sidebar = () => {
  const collapsed = useAppStore((state) => state.ui.collapsedSections);
  const toggleSection = useAppStore((state) => state.toggleSection);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const mode = useAppStore((state) => state.mode);
  const compareActiveSlot = useAppStore((state) => state.compareWorkspace.activeSlotId);
  const compareSlotOrder = useAppStore((state) => state.compareWorkspace.slotOrder);
  const compareBaselineSlot = useAppStore((state) => state.compareWorkspace.baselineSlotId);
  const setCompareActiveSlot = useAppStore((state) => state.setCompareActiveSlot);
  const setCompareBaselineSlot = useAppStore((state) => state.setCompareBaselineSlot);
  const addCompareSlotFromSource = useAppStore((state) => state.addCompareSlotFromSource);
  const removeCompareSlot = useAppStore((state) => state.removeCompareSlot);
  const canAddCompareSlot = compareSlotOrder.length < 8;
  const canRemoveCompareSlot = compareSlotOrder.length > 2;

  return (
    <div className="space-y-3">
      {mode === AppMode.Compare ? (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Compare Slot</p>
          <p className="mt-1 text-sm text-slate-500">Select portfolios to analyze performance.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {compareSlotOrder.map((slotId) => (
              <div key={slotId} className="group relative">
                <button
                  type="button"
                  onClick={() => setCompareActiveSlot(slotId)}
                  onDoubleClick={() => setCompareBaselineSlot(slotId)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                    compareActiveSlot === slotId
                      ? 'border-brand-navy bg-brand-navy text-white shadow-[0_0_0_2px_rgba(29,78,216,0.12)]'
                      : 'border-brand-border bg-white text-slate-700 hover:border-brand-blue'
                  } ${
                    compareBaselineSlot === slotId
                      ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white'
                      : ''
                  }`}
                  title={`Edit Portfolio ${slotId}. Double-click to set baseline.`}
                >
                  {slotId}
                </button>
                {compareBaselineSlot === slotId ? (
                  <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
                    Base
                  </span>
                ) : null}
                {canRemoveCompareSlot ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeCompareSlot(slotId);
                    }}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full border border-rose-200 bg-white text-[10px] font-bold leading-none text-rose-600 shadow-sm transition hover:bg-rose-50 group-hover:inline-flex"
                    title={`Remove Portfolio ${slotId}`}
                  >
                    x
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addCompareSlotFromSource(compareActiveSlot)}
              disabled={!canAddCompareSlot}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white text-xl leading-none text-slate-500 transition hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
              title={canAddCompareSlot ? `Clone active slot ${compareActiveSlot}` : 'Maximum 8 slots'}
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <CollapsibleSection
        id={sectionIds.core}
        title="Core Parameters"
        collapsed={Boolean(collapsed[sectionIds.core])}
        onToggle={toggleSection}
      >
        <CoreParameters />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.portfolio}
        title="Starting Portfolio"
        collapsed={Boolean(collapsed[sectionIds.portfolio])}
        onToggle={toggleSection}
      >
        <StartingPortfolio />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.returns}
        title={simulationMode === SimulationMode.Manual ? 'Return Assumptions' : 'Historical Data'}
        collapsed={Boolean(collapsed[sectionIds.returns])}
        onToggle={toggleSection}
      >
        {simulationMode === SimulationMode.Manual ? (
          <ReturnAssumptions />
        ) : (
          <HistoricalDataSummary />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.phases}
        title="Spending Phases"
        collapsed={Boolean(collapsed[sectionIds.phases])}
        onToggle={toggleSection}
      >
        <SpendingPhases />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.withdrawal}
        title="Withdrawal Strategy"
        collapsed={Boolean(collapsed[sectionIds.withdrawal])}
        onToggle={toggleSection}
      >
        <WithdrawalStrategySection />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.drawdown}
        title="Asset Drawdown Strategy"
        collapsed={Boolean(collapsed[sectionIds.drawdown])}
        onToggle={toggleSection}
      >
        <DrawdownStrategySection />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.income}
        title="Additional Income"
        collapsed={Boolean(collapsed[sectionIds.income])}
        onToggle={toggleSection}
      >
        <IncomeEvents />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.expense}
        title="Large Expenses"
        collapsed={Boolean(collapsed[sectionIds.expense])}
        onToggle={toggleSection}
      >
        <ExpenseEvents />
      </CollapsibleSection>
    </div>
  );
};
