import { Fragment, useState } from 'react';

import { SimulationMode, type SimulationConfig } from '@finapp/shared';

import { getCompareSlotColorVar } from '../../lib/compareSlotColors';
import { buildCompareParameterDiffs } from '../../lib/compareParameterDiffs';
import { useAppStore, useCompareSimulationResults, useIsCompareActive } from '../../store/useAppStore';

export const CompareParameterDiffTable = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isCompareActive = useIsCompareActive();
  const simulationMode = useAppStore((state) => state.simulationMode);
  const compareResults = useCompareSimulationResults();

  if (!isCompareActive) {
    return null;
  }
  const slotOrder = compareResults.slotOrder;
  if (slotOrder.length < 2) {
    return null;
  }

  const baselineSlotId = slotOrder.includes(compareResults.baselineSlotId)
    ? compareResults.baselineSlotId
    : (slotOrder[0] ?? 'A');

  const slotConfigsById: Partial<Record<string, SimulationConfig>> = {};
  let hasCompleteContext = true;
  slotOrder.forEach((slotId) => {
    const workspace = compareResults.slots[slotId];
    if (!workspace) {
      hasCompleteContext = false;
      return;
    }
    const run =
      simulationMode === SimulationMode.Manual
        ? workspace.simulationResults.manual
        : workspace.simulationResults.monteCarlo;
    if (!run?.configSnapshot) {
      hasCompleteContext = false;
      return;
    }
    slotConfigsById[slotId] = run.configSnapshot;
  });

  if (!hasCompleteContext) {
    return null;
  }

  const { rows, differenceCount } = buildCompareParameterDiffs({
    slotOrder,
    baselineSlotId,
    slotConfigsById,
  });

  if (differenceCount === 0) {
    return null;
  }

  const rowsWithGroupFlag = rows.map((row, index) => ({
    row,
    showGroup: index === 0 || rows[index - 1]?.group !== row.group,
  }));

  return (
    <section className="rounded-xl border border-brand-border bg-white shadow-panel">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-t-xl bg-brand-surface px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-slate-800">Comparison Insight: Only Differences</span>
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full bg-[var(--theme-color-surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--theme-color-text-secondary)]">
            {differenceCount} {differenceCount === 1 ? 'Difference' : 'Differences'}
          </span>
          <span className="text-slate-500">{isExpanded ? '▾' : '▸'}</span>
        </span>
      </button>

      {isExpanded ? (
        <div className="space-y-2 p-4">
          <div className="overflow-x-auto rounded-lg border border-brand-border">
            <table className="min-w-[840px] w-full border-collapse text-left text-xs">
              <thead className="bg-brand-surface text-slate-600">
                <tr>
                  <th className="border-b border-brand-border px-3 py-2 font-semibold">Parameter</th>
                  {slotOrder.map((slotId) => (
                    <th key={`diff-head-${slotId}`} className="border-b border-brand-border px-3 py-2 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: getCompareSlotColorVar(slotId) }}
                        />
                        {slotId}
                        {slotId === baselineSlotId ? (
                          <span className="text-[10px] font-medium text-[var(--theme-color-text-secondary)]">
                            (Base)
                          </span>
                        ) : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsWithGroupFlag.map(({ row, showGroup }) => {
                  return (
                    <Fragment key={`grouped-${row.key}`}>
                      {showGroup ? (
                        <tr className="bg-[var(--theme-color-surface-muted)]">
                          <td colSpan={slotOrder.length + 1} className="border-b border-brand-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-color-text-secondary)]">
                            {row.group}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="border-b border-brand-border last:border-b-0">
                        <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                        {slotOrder.map((slotId) => {
                          const isBaseline = slotId === baselineSlotId;
                          const isDeviation = row.differsFromBaselineBySlot[slotId] && !isBaseline;
                          return (
                            <td
                              key={`${row.key}-${slotId}`}
                              className="px-3 py-2 font-mono"
                              style={
                                isDeviation
                                  ? {
                                      backgroundColor:
                                        'color-mix(in srgb, var(--theme-color-info) 10%, var(--theme-color-surface-primary))',
                                      color: 'var(--theme-color-text-primary)',
                                    }
                                  : undefined
                              }
                            >
                              {row.valuesBySlot[slotId]}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--theme-color-text-secondary)]">
            Showing only parameters that differ across active portfolios in the current simulation mode snapshot.
          </p>
        </div>
      ) : null}
    </section>
  );
};
