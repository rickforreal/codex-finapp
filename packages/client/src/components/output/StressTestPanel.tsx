import { useEffect } from 'react';

import { AppMode, SimulationMode, type StressScenario, type StressScenarioType } from '@finapp/shared';

import { runStressTest } from '../../api/stressApi';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../../lib/format';
import {
  getCompareConfigForSlot,
  getCompareWorkspaceState,
  getCurrentConfig,
  useActiveSimulationResult,
  useAppStore,
  useCompareSimulationResults,
} from '../../store/useAppStore';

const scenarioTypes: Array<{ value: StressScenarioType; label: string }> = [
  { value: 'stockCrash', label: 'Stock Crash' },
  { value: 'bondCrash', label: 'Bond Crash' },
  { value: 'broadMarketCrash', label: 'Broad Market Crash' },
  { value: 'prolongedBear', label: 'Prolonged Bear Market' },
  { value: 'highInflationSpike', label: 'High Inflation Spike' },
  { value: 'custom', label: 'Custom' },
];

const accentColors = [
  'var(--theme-color-stress-a)',
  'var(--theme-color-stress-b)',
  'var(--theme-color-stress-c)',
  'var(--theme-color-stress-d)',
];

const replacementScenarioForType = (scenario: StressScenario, type: StressScenarioType): StressScenario => {
  if (type === scenario.type) {
    return scenario;
  }
  if (type === 'stockCrash') {
    return { ...scenario, type, params: { dropPct: -0.3 } };
  }
  if (type === 'bondCrash') {
    return { ...scenario, type, params: { dropPct: -0.15 } };
  }
  if (type === 'broadMarketCrash') {
    return { ...scenario, type, params: { stockDropPct: -0.3, bondDropPct: -0.1 } };
  }
  if (type === 'prolongedBear') {
    return { ...scenario, type, params: { durationYears: 3, stockAnnualReturn: -0.05, bondAnnualReturn: 0.01 } };
  }
  if (type === 'highInflationSpike') {
    return { ...scenario, type, params: { durationYears: 3, inflationRate: 0.08 } };
  }
  return {
    ...scenario,
    type: 'custom',
    params: {
      years: [
        {
          yearOffset: 1,
          stocksAnnualReturn: -0.15,
          bondsAnnualReturn: 0.01,
          cashAnnualReturn: 0.02,
        },
      ],
    },
  };
};

const compactVerticalBarChart = (
  title: string,
  values: Array<{ label: string; value: number; color: string }>,
  asPercent = false,
) => {
  const maxAbs = Math.max(1, ...values.map((item) => Math.abs(item.value)));
  return (
    <div className="rounded-md border border-brand-border bg-white p-2">
      <p className="mb-2 text-[11px] font-semibold text-slate-600">{title}</p>
      <div className="flex h-32 items-end gap-2">
        {values.map((item, index) => {
          const height = `${Math.max(4, (Math.abs(item.value) / maxAbs) * 100)}%`;
          return (
            <div key={`${title}-${item.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-slate-700">
                {asPercent ? formatPercent(item.value, 1) : formatCompactCurrency(Math.round(item.value))}
              </span>
              <div className="flex h-24 w-full items-end rounded bg-slate-100 px-1">
                <div
                  className="w-full rounded-t"
                  style={{ height, backgroundColor: item.color }}
                  title={`${item.label}: ${asPercent ? formatPercent(item.value, 1) : formatCurrency(Math.round(item.value))}`}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-slate-600">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const deriveMonthlyReturnsFromRows = (
  rows: Array<{
    startBalances: { stocks: number; bonds: number; cash: number };
    marketChange: { stocks: number; bonds: number; cash: number };
  }>,
) =>
  rows.map((row) => ({
    stocks: row.startBalances.stocks === 0 ? 0 : row.marketChange.stocks / row.startBalances.stocks,
    bonds: row.startBalances.bonds === 0 ? 0 : row.marketChange.bonds / row.startBalances.bonds,
    cash: row.startBalances.cash === 0 ? 0 : row.marketChange.cash / row.startBalances.cash,
  }));

export const StressTestPanel = () => {
  const mode = useAppStore((state) => state.mode);
  const compareWorkspace = useCompareSimulationResults();
  const simulationMode = useAppStore((state) => state.simulationMode);
  const stress = useAppStore((state) => state.stress);
  const toggleStressPanel = useAppStore((state) => state.toggleStressPanel);
  const addStressScenario = useAppStore((state) => state.addStressScenario);
  const removeStressScenario = useAppStore((state) => state.removeStressScenario);
  const updateStressScenario = useAppStore((state) => state.updateStressScenario);
  const setStressStatus = useAppStore((state) => state.setStressStatus);
  const setStressResult = useAppStore((state) => state.setStressResult);
  const clearStressResult = useAppStore((state) => state.clearStressResult);
  const setCompareSlotStressStatus = useAppStore((state) => state.setCompareSlotStressStatus);
  const setCompareSlotStressResult = useAppStore((state) => state.setCompareSlotStressResult);
  const clearCompareSlotStressResult = useAppStore((state) => state.clearCompareSlotStressResult);
  const actualOverridesByMonth = useAppStore((state) => state.actualOverridesByMonth);
  const activeResult = useActiveSimulationResult();
  const baseMonteCarlo = useAppStore((state) => state.simulationResults.monteCarlo?.monteCarlo);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);

  useEffect(() => {
    const resolveSlotResult = (
      workspace: (typeof compareWorkspace)['leftWorkspace'],
    ) => {
      if (!workspace) {
        return null;
      }
      const preferred =
        simulationMode === SimulationMode.Manual
          ? workspace.simulationResults.manual
          : workspace.simulationResults.monteCarlo;
      return preferred ?? workspace.simulationResults.manual ?? workspace.simulationResults.monteCarlo;
    };

    const compareLeftResult = resolveSlotResult(compareWorkspace.leftWorkspace);
    const compareRightResult = resolveSlotResult(compareWorkspace.rightWorkspace);
    const compareBaseAvailable = Boolean(compareLeftResult || compareRightResult);
    const baseAvailable = mode === AppMode.Compare ? compareBaseAvailable : Boolean(activeResult);

    if (!baseAvailable || stress.scenarios.length === 0) {
      const currentState = useAppStore.getState();
      const globalStressNeedsClear =
        currentState.stress.result !== null ||
        currentState.stress.status !== 'idle' ||
        currentState.stress.errorMessage !== null;
      if (globalStressNeedsClear) {
        clearStressResult();
      }
      if (mode === AppMode.Compare) {
        const leftStress = currentState.compareWorkspace.leftWorkspace?.stress;
        const rightStress = currentState.compareWorkspace.rightWorkspace?.stress;
        const leftNeedsClear = Boolean(
          leftStress &&
            (leftStress.result !== null ||
              leftStress.status !== 'idle' ||
              leftStress.errorMessage !== null),
        );
        const rightNeedsClear = Boolean(
          rightStress &&
            (rightStress.result !== null ||
              rightStress.status !== 'idle' ||
              rightStress.errorMessage !== null),
        );
        if (leftNeedsClear) {
          clearCompareSlotStressResult('left');
        }
        if (rightNeedsClear) {
          clearCompareSlotStressResult('right');
        }
      }
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (mode !== AppMode.Compare) {
        if (!activeResult) {
          return;
        }
        setStressStatus('running');
        void runStressTest({
          config: getCurrentConfig(),
          scenarios: stress.scenarios,
          actualOverridesByMonth,
          seed: activeResult.seedUsed,
          monthlyReturns: simulationMode === SimulationMode.Manual
            ? deriveMonthlyReturnsFromRows(activeResult.result.rows)
            : undefined,
          base: {
            result: activeResult.result,
            monteCarlo: simulationMode === SimulationMode.MonteCarlo ? baseMonteCarlo : undefined,
          },
        })
          .then((response) => {
            if (controller.signal.aborted) {
              return;
            }
            setStressResult(response.result);
          })
          .catch((error) => {
            if (controller.signal.aborted) {
              return;
            }
            const message = error instanceof Error ? error.message : 'Stress test failed';
            setStressStatus('error', message);
          });
        return;
      }

      setStressStatus('running');
      setCompareSlotStressStatus('left', 'running');
      setCompareSlotStressStatus('right', 'running');

      const slots: Array<{ slot: 'left' | 'right'; result: typeof compareLeftResult }> = [
        { slot: 'left', result: compareLeftResult },
        { slot: 'right', result: compareRightResult },
      ];
      const currentCompareWorkspace = getCompareWorkspaceState();

      void Promise.allSettled(
        slots.map(async ({ slot, result }) => {
          if (!result) {
            throw new Error(`Portfolio ${slot === 'left' ? 'A' : 'B'} has no base simulation result.`);
          }
          const config = getCompareConfigForSlot(slot);
          if (!config) {
            throw new Error(`Portfolio ${slot === 'left' ? 'A' : 'B'} configuration unavailable.`);
          }
          const workspace = slot === 'left' ? currentCompareWorkspace.leftWorkspace : currentCompareWorkspace.rightWorkspace;
          const response = await runStressTest({
            config,
            scenarios: stress.scenarios,
            actualOverridesByMonth: workspace?.actualOverridesByMonth ?? {},
            seed: result.seedUsed,
            monthlyReturns:
              simulationMode === SimulationMode.Manual
                ? deriveMonthlyReturnsFromRows(result.result.rows)
                : undefined,
            base: {
              result: result.result,
              monteCarlo: simulationMode === SimulationMode.MonteCarlo ? result.monteCarlo : undefined,
            },
          });
          return { slot, response };
        }),
      ).then((settled) => {
        if (controller.signal.aborted) {
          return;
        }
        const errors: string[] = [];
        const activeSlot = compareWorkspace.activeSlot;
        let activeSlotResultSet = false;

        settled.forEach((entry, index) => {
          const slot = slots[index]?.slot;
          if (!slot) {
            return;
          }
          if (entry.status === 'fulfilled') {
            setCompareSlotStressResult(slot, entry.value.response.result);
            if (slot === activeSlot) {
              setStressResult(entry.value.response.result);
              activeSlotResultSet = true;
            }
          } else {
            const message = entry.reason instanceof Error ? entry.reason.message : 'Stress test failed';
            setCompareSlotStressStatus(slot, 'error', message);
            errors.push(`${slot === 'left' ? 'Portfolio A' : 'Portfolio B'}: ${message}`);
          }
        });

        if (!activeSlotResultSet) {
          const fallbackSlot = activeSlot === 'left' ? 'right' : 'left';
          const fallbackResult = settled.find(
            (entry, index) =>
              slots[index]?.slot === fallbackSlot && entry.status === 'fulfilled',
          );
          if (fallbackResult && fallbackResult.status === 'fulfilled') {
            setStressResult(fallbackResult.value.response.result);
            activeSlotResultSet = true;
          }
        }

        if (errors.length > 0) {
          setStressStatus('error', errors.join(' | '));
        } else {
          setStressStatus('complete');
        }
      });
    }, simulationMode === SimulationMode.MonteCarlo ? 500 : 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    activeResult,
    actualOverridesByMonth,
    baseMonteCarlo,
    compareWorkspace.activeSlot,
    compareWorkspace.leftWorkspace?.simulationResults.manual,
    compareWorkspace.leftWorkspace?.simulationResults.monteCarlo,
    compareWorkspace.rightWorkspace?.simulationResults.manual,
    compareWorkspace.rightWorkspace?.simulationResults.monteCarlo,
    clearCompareSlotStressResult,
    clearStressResult,
    mode,
    setCompareSlotStressResult,
    setCompareSlotStressStatus,
    setStressResult,
    setStressStatus,
    simulationMode,
    stress.scenarios,
  ]);

  const compareBaseAvailable = Boolean(
    compareWorkspace.leftWorkspace?.simulationResults.manual ||
      compareWorkspace.leftWorkspace?.simulationResults.monteCarlo ||
      compareWorkspace.rightWorkspace?.simulationResults.manual ||
      compareWorkspace.rightWorkspace?.simulationResults.monteCarlo,
  );
  const baseAvailable = mode === AppMode.Compare ? compareBaseAvailable : Boolean(activeResult);
  const result = stress.result;
  const comparisonSet = result
    ? [
        { label: 'Base', color: 'var(--theme-color-stress-base)', rows: result.base.result.rows, metrics: result.base.metrics },
        ...result.scenarios.map((scenario, index) => ({
          label: scenario.scenarioLabel,
          color: accentColors[index] ?? 'var(--theme-color-info)',
          rows: scenario.result.rows,
          metrics: scenario.metrics,
        })),
      ]
    : [];

  const withdrawalStats = comparisonSet.map((entry) => {
    const realMonthlyWithdrawals = entry.rows.map((row) => {
      const factor = (1 + inflationRate) ** (row.monthIndex / 12);
      return row.withdrawals.actual / factor;
    });
    const sorted = [...realMonthlyWithdrawals].sort((a, b) => a - b);
    const mean = realMonthlyWithdrawals.length
      ? realMonthlyWithdrawals.reduce((sum, value) => sum + value, 0) / realMonthlyWithdrawals.length
      : 0;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 0
          ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
          : (sorted[mid] ?? 0);
    return { label: entry.label, color: entry.color, mean, median };
  });

  return (
    <section className="rounded-xl border border-brand-border bg-white shadow-panel">
      <button
        type="button"
        onClick={toggleStressPanel}
        className="flex w-full items-center justify-between rounded-t-xl bg-brand-surface px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">Stress Test</span>
        <span className="text-slate-500">{stress.isExpanded ? '▾' : '▸'}</span>
      </button>

      {stress.isExpanded ? (
        <div className="space-y-4 p-4">
          {!baseAvailable ? (
            <div className="rounded-lg border border-dashed border-brand-border px-4 py-10 text-center text-sm text-slate-500">
              Run a simulation first to enable stress testing.
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {stress.scenarios.map((scenario, index) => {
                  const accent = accentColors[index] ?? accentColors[0];
                  return (
                    <article
                      key={scenario.id}
                      className="w-[280px] shrink-0 rounded-lg border border-brand-border bg-white"
                      style={{ borderTop: `3px solid ${accent}` }}
                    >
                      <div className="space-y-2 p-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={scenario.label}
                            onChange={(event) =>
                              updateStressScenario(scenario.id, {
                                ...scenario,
                                label: event.target.value.slice(0, 24),
                              })
                            }
                            className="w-full rounded border border-brand-border px-2 py-1 text-sm font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => removeStressScenario(scenario.id)}
                            className="rounded border border-brand-border px-2 py-1 text-xs text-slate-600"
                          >
                            Remove
                          </button>
                        </div>
                        <select
                          value={scenario.type}
                          onChange={(event) =>
                            updateStressScenario(
                              scenario.id,
                              replacementScenarioForType(scenario, event.target.value as StressScenarioType),
                            )
                          }
                          className="w-full rounded border border-brand-border px-2 py-1 text-sm"
                        >
                          {scenarioTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                          <span>Starts in Year</span>
                          <input
                            type="number"
                            min={1}
                            max={getCurrentConfig().coreParams.retirementDuration}
                            value={scenario.startYear}
                            onChange={(event) =>
                              updateStressScenario(scenario.id, {
                                ...scenario,
                                startYear: Math.max(1, Math.round(Number(event.target.value) || 1)),
                              })
                            }
                            className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                          />
                        </label>

                        {scenario.type === 'stockCrash' || scenario.type === 'bondCrash' ? (
                          <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                            <span>Drop (%)</span>
                            <input
                              type="number"
                              value={Math.round(scenario.params.dropPct * 100)}
                              onChange={(event) =>
                                updateStressScenario(scenario.id, {
                                  ...scenario,
                                  params: { dropPct: Math.min(0, Number(event.target.value || 0) / 100) },
                                })
                              }
                              className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                            />
                          </label>
                        ) : null}

                        {scenario.type === 'broadMarketCrash' ? (
                          <>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Stock Drop (%)</span>
                              <input
                                type="number"
                                value={Math.round(scenario.params.stockDropPct * 100)}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      stockDropPct: Math.min(0, Number(event.target.value || 0) / 100),
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Bond Drop (%)</span>
                              <input
                                type="number"
                                value={Math.round(scenario.params.bondDropPct * 100)}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      bondDropPct: Math.min(0, Number(event.target.value || 0) / 100),
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                          </>
                        ) : null}

                        {scenario.type === 'prolongedBear' ? (
                          <>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Duration (yrs)</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={scenario.params.durationYears}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      durationYears: Math.max(1, Math.min(10, Math.round(Number(event.target.value) || 1))),
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Stock Return (%)</span>
                              <input
                                type="number"
                                value={Math.round(scenario.params.stockAnnualReturn * 100)}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      stockAnnualReturn: Number(event.target.value || 0) / 100,
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Bond Return (%)</span>
                              <input
                                type="number"
                                value={Math.round(scenario.params.bondAnnualReturn * 100)}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      bondAnnualReturn: Number(event.target.value || 0) / 100,
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                          </>
                        ) : null}

                        {scenario.type === 'highInflationSpike' ? (
                          <>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Inflation (%)</span>
                              <input
                                type="number"
                                value={Math.round(scenario.params.inflationRate * 100)}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      inflationRate: Math.max(0, Number(event.target.value || 0) / 100),
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Duration (yrs)</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={scenario.params.durationYears}
                                onChange={(event) =>
                                  updateStressScenario(scenario.id, {
                                    ...scenario,
                                    params: {
                                      ...scenario.params,
                                      durationYears: Math.max(1, Math.min(10, Math.round(Number(event.target.value) || 1))),
                                    },
                                  })
                                }
                                className="w-20 rounded border border-brand-border px-2 py-1 text-right text-sm"
                              />
                            </label>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                {stress.scenarios.length < 4 ? (
                  <button
                    type="button"
                    onClick={addStressScenario}
                    className="flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-lg border border-dashed border-brand-border text-sm text-slate-500"
                  >
                    + Add Scenario
                  </button>
                ) : null}
              </div>

              {stress.status === 'running' ? <p className="text-xs text-slate-500">Computing stress scenarios...</p> : null}
              {stress.errorMessage ? <p className="text-xs text-red-600">{stress.errorMessage}</p> : null}

              {result ? (
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {compactVerticalBarChart(
                      'Terminal Value',
                      comparisonSet.map((entry) => ({
                        label: entry.label,
                        value: entry.metrics.terminalValue,
                        color: entry.color,
                      })),
                    )}
                    {compactVerticalBarChart(
                      'Total Drawdown (Real)',
                      comparisonSet.map((entry) => ({
                        label: entry.label,
                        value: entry.metrics.totalDrawdownReal,
                        color: entry.color,
                      })),
                    )}
                    {compactVerticalBarChart(
                      'Median Monthly Withdrawal (Real)',
                      withdrawalStats.map((entry) => ({
                        label: entry.label,
                        value: entry.median,
                        color: entry.color,
                      })),
                    )}
                    {compactVerticalBarChart(
                      'Mean Monthly Withdrawal (Real)',
                      withdrawalStats.map((entry) => ({
                        label: entry.label,
                        value: entry.mean,
                        color: entry.color,
                      })),
                    )}
                    {simulationMode === SimulationMode.MonteCarlo
                      ? compactVerticalBarChart(
                          'Probability of Success',
                          comparisonSet.map((entry) => ({
                            label: entry.label,
                            value: entry.metrics.probabilityOfSuccess ?? 0,
                            color: entry.color,
                          })),
                          true,
                        )
                      : null}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-brand-border">
                    <table className="min-w-full text-[11px] leading-4">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-2 py-1.5 text-left">Metric</th>
                          <th className="px-2 py-1.5 text-right">Base</th>
                          {result.scenarios.map((scenario) => (
                            <th key={scenario.scenarioId} className="px-2 py-1.5 text-right">
                              {scenario.scenarioLabel}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-brand-border">
                          <td className="px-2 py-1.5">Terminal Value</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(Math.round(result.base.metrics.terminalValue))}</td>
                          {result.scenarios.map((scenario) => (
                            <td key={`${scenario.scenarioId}-terminal`} className="px-2 py-1.5 text-right">
                              {formatCurrency(Math.round(scenario.metrics.terminalValue))}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-brand-border">
                          <td className="px-2 py-1.5">Delta vs Base</td>
                          <td className="px-2 py-1.5 text-right">$0</td>
                          {result.scenarios.map((scenario) => (
                            <td key={`${scenario.scenarioId}-delta`} className="px-2 py-1.5 text-right text-rose-700">
                              {formatCurrency(Math.round(scenario.metrics.terminalDeltaVsBase))}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-brand-border">
                          <td className="px-2 py-1.5">Total Drawdown (Real)</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(Math.round(result.base.metrics.totalDrawdownReal))}</td>
                          {result.scenarios.map((scenario) => (
                            <td key={`${scenario.scenarioId}-drawdown`} className="px-2 py-1.5 text-right">
                              {formatCurrency(Math.round(scenario.metrics.totalDrawdownReal))}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-brand-border">
                          <td className="px-2 py-1.5">Median Monthly Withdrawal (Real)</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(Math.round(withdrawalStats[0]?.median ?? 0))}</td>
                          {result.scenarios.map((scenario, index) => (
                            <td key={`${scenario.scenarioId}-median`} className="px-2 py-1.5 text-right">
                              {formatCurrency(Math.round(withdrawalStats[index + 1]?.median ?? 0))}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-brand-border">
                          <td className="px-2 py-1.5">Mean Monthly Withdrawal (Real)</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(Math.round(withdrawalStats[0]?.mean ?? 0))}</td>
                          {result.scenarios.map((scenario, index) => (
                            <td key={`${scenario.scenarioId}-mean`} className="px-2 py-1.5 text-right">
                              {formatCurrency(Math.round(withdrawalStats[index + 1]?.mean ?? 0))}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-brand-border">
                          <td className="px-2 py-1.5">Depletion Month</td>
                          <td className="px-2 py-1.5 text-right">{result.base.metrics.depletionMonth ?? 'Never'}</td>
                          {result.scenarios.map((scenario) => (
                            <td key={`${scenario.scenarioId}-depletion`} className="px-2 py-1.5 text-right">
                              {scenario.metrics.depletionMonth ?? 'Never'}
                            </td>
                          ))}
                        </tr>
                        {simulationMode === SimulationMode.MonteCarlo ? (
                          <tr className="border-t border-brand-border">
                            <td className="px-2 py-1.5">Probability of Success</td>
                            <td className="px-2 py-1.5 text-right">{formatPercent(result.base.metrics.probabilityOfSuccess ?? 0, 1)}</td>
                            {result.scenarios.map((scenario) => (
                              <td key={`${scenario.scenarioId}-pos`} className="px-2 py-1.5 text-right">
                                {formatPercent(scenario.metrics.probabilityOfSuccess ?? 0, 1)}
                              </td>
                            ))}
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {mode === AppMode.Tracking ? (
                    <p className="text-xs text-slate-500">Tracking mode: Year 1 refers to the first projected year after actuals.</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
};
