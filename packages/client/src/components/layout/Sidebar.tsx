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
import { getCompareSlotColorVar } from '../../lib/compareSlotColors';
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
            {compareSlotOrder.map((slotId) => {
              const slotColor = getCompareSlotColorVar(slotId);
              const isActive = compareActiveSlot === slotId;
              const isBaseline = compareBaselineSlot === slotId;
              const chipShadows: string[] = [];
              if (isBaseline) {
                chipShadows.push(
                  '0 0 0 2px var(--theme-color-surface-primary)',
                  `0 0 0 4px ${slotColor}`,
                );
              }
              if (isActive) {
                chipShadows.push(`0 0 0 2px color-mix(in srgb, ${slotColor} 26%, transparent)`);
              }
              return (
                <div key={slotId} className="group flex flex-col items-center gap-[5px] pb-0.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCompareActiveSlot(slotId)}
                      onDoubleClick={() => setCompareBaselineSlot(slotId)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition"
                      style={{
                        borderColor: slotColor,
                        backgroundColor: isActive
                          ? slotColor
                          : `color-mix(in srgb, ${slotColor} 22%, var(--theme-color-surface-primary))`,
                        color: isActive
                          ? 'var(--theme-color-text-inverse)'
                          : `color-mix(in srgb, ${slotColor} 72%, var(--theme-color-text-primary))`,
                        boxShadow: chipShadows.length > 0 ? chipShadows.join(', ') : undefined,
                      }}
                      title={`Edit Portfolio ${slotId}. Double-click to set baseline.`}
                    >
                      {slotId}
                    </button>
                    {canRemoveCompareSlot ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeCompareSlot(slotId);
                        }}
                        className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none shadow-sm transition group-hover:inline-flex"
                        style={{
                          backgroundColor: 'var(--theme-color-negative)',
                          borderColor: 'var(--theme-color-negative)',
                          color: 'var(--theme-color-text-inverse)',
                        }}
                        title={`Remove Portfolio ${slotId}`}
                      >
                        x
                      </button>
                    ) : null}
                  </div>
                  {isBaseline ? (
                    <span className="pointer-events-none text-[10px] font-normal leading-none text-[var(--theme-color-text-secondary)]">
                      Base
                    </span>
                  ) : (
                    <span className="pointer-events-none text-[10px] leading-none opacity-0" aria-hidden>
                      Base
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col items-center gap-[5px] pb-0.5">
              <button
                type="button"
                onClick={() => addCompareSlotFromSource(compareActiveSlot)}
                disabled={!canAddCompareSlot}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white text-xl leading-none text-slate-500 transition hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
                title={canAddCompareSlot ? `Clone active slot ${compareActiveSlot}` : 'Maximum 8 slots'}
              >
                +
              </button>
              <span className="pointer-events-none text-[10px] leading-none opacity-0" aria-hidden>
                Base
              </span>
            </div>
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
