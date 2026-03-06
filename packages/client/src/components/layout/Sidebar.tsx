import { ReturnSource } from '@finapp/shared';

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
import { CompareSyncControl } from '../shared/CompareSyncControl';
import { SegmentedToggle } from '../shared/SegmentedToggle';
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

const SIMULATION_RUN_MIN = 1;
const SIMULATION_RUN_MAX = 10000;
const SIMULATION_RUN_MAGNET_STOPS = [100, 500, 1000, 5000] as const;

const snapSimulationRuns = (raw: number): number => {
  const clamped = Math.max(SIMULATION_RUN_MIN, Math.min(SIMULATION_RUN_MAX, Math.round(raw)));
  const closestStop = SIMULATION_RUN_MAGNET_STOPS.reduce((closest, stop) =>
    Math.abs(stop - clamped) < Math.abs(closest - clamped) ? stop : closest,
  );
  const snapWindow = Math.max(20, Math.round(closestStop * 0.08));
  if (Math.abs(closestStop - clamped) <= snapWindow) {
    return closestStop;
  }
  return clamped;
};

export const Sidebar = () => {
  const collapsed = useAppStore((state) => state.ui.collapsedSections);
  const toggleSection = useAppStore((state) => state.toggleSection);
  const returnsSource = useAppStore((state) => state.returnsSource);
  const simulationRuns = useAppStore((state) => state.simulationRuns);
  const returnAssumptions = useAppStore((state) => state.returnAssumptions);
  const setReturnsSource = useAppStore((state) => state.setReturnsSource);
  const setSimulationRuns = useAppStore((state) => state.setSimulationRuns);
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
  const returnsSync = useCompareFamilyLockUiState('returnAssumptions');
  const phasesSync = useCompareFamilyLockUiState('spendingPhases');
  const withdrawalSync = useCompareFamilyLockUiState('withdrawalStrategy');
  const drawdownSync = useCompareFamilyLockUiState('drawdownStrategy');
  const incomeSync = useCompareFamilyLockUiState('incomeEvents');
  const expenseSync = useCompareFamilyLockUiState('expenseEvents');
  const historicalSync = useCompareFamilyLockUiState('historicalEra');
  const returnsControlsReadOnly = returnsSync.readOnly || historicalSync.readOnly;
  const manualDeterministic =
    returnsSource === ReturnSource.Manual &&
    returnAssumptions.stocks.stdDev <= 0 &&
    returnAssumptions.bonds.stdDev <= 0 &&
    returnAssumptions.cash.stdDev <= 0;
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
        headerAction={
          returnsSource === ReturnSource.Manual ? (
            <CompareSyncControl
              slotId={returnsSync.slotId}
              locked={returnsSync.locked}
              synced={returnsSync.synced}
              onToggleLock={() => toggleCompareFamilyLock('returnAssumptions')}
              onToggleSync={(synced) =>
                setCompareSlotFamilySync(returnsSync.slotId, 'returnAssumptions', synced)
              }
            />
          ) : (
            <CompareSyncControl
              slotId={historicalSync.slotId}
              locked={historicalSync.locked}
              synced={historicalSync.synced}
              onToggleLock={() => toggleCompareFamilyLock('historicalEra')}
              onToggleSync={(synced) =>
                setCompareSlotFamilySync(historicalSync.slotId, 'historicalEra', synced)
              }
            />
          )
        }
      >
        <div className="space-y-3">
          <SegmentedToggle
            value={returnsSource}
            onChange={(nextSource) => {
              if (returnsControlsReadOnly) {
                return;
              }
              setReturnsSource(nextSource);
            }}
            className="w-full"
            options={[
              { label: 'Manual', value: ReturnSource.Manual },
              { label: 'Historical', value: ReturnSource.Historical },
            ]}
          />
          <div className="rounded border border-brand-border p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--theme-color-text-secondary)]">
                Simulation Runs
              </p>
              <p className="text-[11px] text-[var(--theme-color-text-secondary)]">
                {manualDeterministic ? 'Effective: 1' : `Effective: ${simulationRuns}`}
              </p>
            </div>
            <input
              type="range"
              min={SIMULATION_RUN_MIN}
              max={SIMULATION_RUN_MAX}
              step={1}
              value={simulationRuns}
              onChange={(event) => setSimulationRuns(snapSimulationRuns(Number(event.target.value)))}
              disabled={returnsControlsReadOnly}
              className="w-full accent-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--theme-color-text-secondary)]">
              <span>1</span>
              <span>10000</span>
            </div>
            {manualDeterministic ? (
              <p className="mt-1 text-[11px] text-[var(--theme-color-text-secondary)]">
                All Std Dev values are 0%, so runs collapse to a deterministic single path.
              </p>
            ) : null}
          </div>
          {returnsSource === ReturnSource.Manual ? (
            <ReturnAssumptions readOnly={returnsSync.readOnly} />
          ) : (
            <HistoricalDataSummary readOnly={historicalSync.readOnly} />
          )}
        </div>
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
