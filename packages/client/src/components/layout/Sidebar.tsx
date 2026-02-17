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
import { SegmentedToggle } from '../shared/SegmentedToggle';

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
  const compareActiveSlot = useAppStore((state) => state.compareWorkspace.activeSlot);
  const setCompareActiveSlot = useAppStore((state) => state.setCompareActiveSlot);

  return (
    <div className="space-y-3">
      {mode === AppMode.Compare ? (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Compare Slot</p>
          <SegmentedToggle
            value={compareActiveSlot}
            onChange={(value) => setCompareActiveSlot(value as 'left' | 'right')}
            options={[
              { label: 'Portfolio A', value: 'left' },
              { label: 'Portfolio B', value: 'right' },
            ]}
          />
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
