import { CoreParameters } from '../inputs/CoreParameters';
import { StartingPortfolio } from '../inputs/StartingPortfolio';
import { ReturnPhases } from '../inputs/ReturnPhases';
import { SpendingPhases } from '../inputs/SpendingPhases/SpendingPhases';
import { WithdrawalStrategySection } from '../inputs/WithdrawalStrategy/WithdrawalStrategy';
import { DrawdownStrategySection } from '../inputs/DrawdownStrategy/DrawdownStrategy';
import { IncomeEvents } from '../inputs/IncomeEvents/IncomeEvents';
import { ExpenseEvents } from '../inputs/ExpenseEvents/ExpenseEvents';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { CompareSyncControl } from '../shared/CompareSyncControl';
import { getCompareSlotColorVar } from '../../lib/compareSlotColors';
import { useAppStore, useCompareFamilyLockUiState } from '../../store/useAppStore';

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
  const compareActiveSlot = useAppStore((state) => state.compareWorkspace.activeSlotId);
  const compareSlotOrder = useAppStore((state) => state.compareWorkspace.slotOrder);
  const compareBaselineSlot = useAppStore((state) => state.compareWorkspace.baselineSlotId);
  const setCompareActiveSlot = useAppStore((state) => state.setCompareActiveSlot);
  const setCompareBaselineSlot = useAppStore((state) => state.setCompareBaselineSlot);
  const addCompareSlotFromSource = useAppStore((state) => state.addCompareSlotFromSource);
  const removeCompareSlot = useAppStore((state) => state.removeCompareSlot);
  const toggleCompareFamilyLock = useAppStore((state) => state.toggleCompareFamilyLock);
  const setCompareSlotFamilySync = useAppStore((state) => state.setCompareSlotFamilySync);
  const coreSync = useCompareFamilyLockUiState('coreParams');
  const portfolioSync = useCompareFamilyLockUiState('startingPortfolio');
  const returnPhasesSync = useCompareFamilyLockUiState('returnPhases');
  const phasesSync = useCompareFamilyLockUiState('spendingPhases');
  const withdrawalSync = useCompareFamilyLockUiState('withdrawalStrategy');
  const drawdownSync = useCompareFamilyLockUiState('drawdownStrategy');
  const incomeSync = useCompareFamilyLockUiState('incomeEvents');
  const expenseSync = useCompareFamilyLockUiState('expenseEvents');
  const canAddCompareSlot = compareSlotOrder.length < 8;
  const canRemoveCompareSlot = compareSlotOrder.length > 1;

  return (
    <div className="space-y-3">
      <div className="theme-sidebar-compare-card rounded-xl border p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <p className="theme-sidebar-compare-card-title text-[11px] font-semibold uppercase tracking-[0.14em]">Compare Slot</p>
          <p className="theme-sidebar-compare-card-text mt-1 text-sm">Select portfolios to analyze performance.</p>
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
                    {canRemoveCompareSlot && slotId !== 'A' ? (
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
                className="theme-sidebar-add-slot-btn inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl leading-none transition disabled:cursor-not-allowed disabled:opacity-40"
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

      <CollapsibleSection
        id={sectionIds.core}
        title="Core Parameters"
        collapsed={Boolean(collapsed[sectionIds.core])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={coreSync.slotId}
            locked={coreSync.locked}
            synced={coreSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('coreParams')}
            onToggleSync={(synced) => setCompareSlotFamilySync(coreSync.slotId, 'coreParams', synced)}
          />
        )}
      >
        <CoreParameters />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.portfolio}
        title="Starting Portfolio"
        collapsed={Boolean(collapsed[sectionIds.portfolio])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={portfolioSync.slotId}
            locked={portfolioSync.locked}
            synced={portfolioSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('startingPortfolio')}
            onToggleSync={(synced) => setCompareSlotFamilySync(portfolioSync.slotId, 'startingPortfolio', synced)}
          />
        )}
      >
        <StartingPortfolio />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.returns}
        title="Returns"
        collapsed={Boolean(collapsed[sectionIds.returns])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={returnPhasesSync.slotId}
            locked={returnPhasesSync.locked}
            synced={returnPhasesSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('returnPhases')}
            onToggleSync={(synced) =>
              setCompareSlotFamilySync(returnPhasesSync.slotId, 'returnPhases', synced)
            }
          />
        )}
      >
        <ReturnPhases />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.phases}
        title="Spending Phases"
        collapsed={Boolean(collapsed[sectionIds.phases])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={phasesSync.slotId}
            locked={phasesSync.locked}
            synced={phasesSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('spendingPhases')}
            onToggleSync={(synced) => setCompareSlotFamilySync(phasesSync.slotId, 'spendingPhases', synced)}
          />
        )}
      >
        <SpendingPhases />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.withdrawal}
        title="Withdrawal Strategy"
        collapsed={Boolean(collapsed[sectionIds.withdrawal])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={withdrawalSync.slotId}
            locked={withdrawalSync.locked}
            synced={withdrawalSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('withdrawalStrategy')}
            onToggleSync={(synced) => setCompareSlotFamilySync(withdrawalSync.slotId, 'withdrawalStrategy', synced)}
          />
        )}
      >
        <WithdrawalStrategySection />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.drawdown}
        title="Asset Drawdown Strategy"
        collapsed={Boolean(collapsed[sectionIds.drawdown])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={drawdownSync.slotId}
            locked={drawdownSync.locked}
            synced={drawdownSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('drawdownStrategy')}
            onToggleSync={(synced) => setCompareSlotFamilySync(drawdownSync.slotId, 'drawdownStrategy', synced)}
          />
        )}
      >
        <DrawdownStrategySection />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.income}
        title="Additional Income"
        collapsed={Boolean(collapsed[sectionIds.income])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={incomeSync.slotId}
            locked={incomeSync.locked}
            synced={incomeSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('incomeEvents')}
            onToggleSync={(synced) => setCompareSlotFamilySync(incomeSync.slotId, 'incomeEvents', synced)}
          />
        )}
      >
        <IncomeEvents />
      </CollapsibleSection>

      <CollapsibleSection
        id={sectionIds.expense}
        title="Large Expenses"
        collapsed={Boolean(collapsed[sectionIds.expense])}
        onToggle={toggleSection}
        headerAction={(
          <CompareSyncControl
            slotId={expenseSync.slotId}
            locked={expenseSync.locked}
            synced={expenseSync.synced}
            onToggleLock={() => toggleCompareFamilyLock('expenseEvents')}
            onToggleSync={(synced) => setCompareSlotFamilySync(expenseSync.slotId, 'expenseEvents', synced)}
          />
        )}
      >
        <ExpenseEvents />
      </CollapsibleSection>
    </div>
  );
};
