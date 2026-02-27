import { useMemo } from 'react';

import { SimulationMode } from '@finapp/shared';

import { buildAnnualDetailRows, buildMonthlyDetailRows, sortDetailRows, type DetailRow } from '../../../lib/detailTable';
import {
  type WorkspaceSnapshot,
  useActiveSimulationResult,
  useAppStore,
  useCompareSimulationResults,
  useIsCompareActive,
} from '../../../store/useAppStore';

/**
 * Unified data pipeline for the detail ledger.
 *
 * In single-slot mode, returns rows from the active simulation result.
 * In compare mode, returns rows for the currently active compare slot.
 *
 * This eliminates the `if (isCompareActive)` branch in the component tree —
 * consumers always get a single flat list of rows and a slot context.
 */
export const useDetailRows = (): {
  rows: DetailRow[];
  activeLedgerSlotId: string;
  canonicalBoundary: number | null;
  runInflationRate: number | null;
} => {
  const result = useActiveSimulationResult();
  const compareResults = useCompareSimulationResults();
  const isCompareActive = useIsCompareActive();
  const startingAge = useAppStore((state) => state.coreParams.startingAge);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const retirementStartDate = useAppStore((state) => state.coreParams.retirementStartDate);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const tableGranularity = useAppStore((state) => state.ui.tableGranularity);
  const tableSort = useAppStore((state) => state.ui.tableSort);
  const compareActiveSlotId = useAppStore((state) => state.compareWorkspace.activeSlotId);

  const singleSlotRows = useMemo(() => {
    if (isCompareActive) {
      return [];
    }
    const resultRows = result?.result.rows ?? [];
    const runStartingAge = result?.configSnapshot?.coreParams.startingAge ?? startingAge;
    const runInflationRate = result?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const runRetirementStartDate = result?.configSnapshot?.coreParams.retirementStartDate ?? retirementStartDate;
    const runMonteCarloTotalP50 =
      simulationMode === SimulationMode.MonteCarlo
        ? (result?.monteCarlo?.percentileCurves.total.p50 ?? null)
        : null;
    const raw =
      tableGranularity === 'annual'
        ? buildAnnualDetailRows(resultRows, runStartingAge, runInflationRate, runRetirementStartDate, runMonteCarloTotalP50)
        : buildMonthlyDetailRows(resultRows, runStartingAge, runInflationRate, runRetirementStartDate, runMonteCarloTotalP50);
    return sortDetailRows(raw, tableSort);
  }, [inflationRate, isCompareActive, result, retirementStartDate, simulationMode, startingAge, tableGranularity, tableSort]);

  const compareSlotRows = useMemo(() => {
    if (!isCompareActive) {
      return [];
    }
    const resolveSlotResult = (workspace: WorkspaceSnapshot | undefined) => {
      if (!workspace) {
        return null;
      }
      const preferred =
        simulationMode === SimulationMode.Manual
          ? workspace.simulationResults.manual
          : workspace.simulationResults.monteCarlo;
      return preferred ?? workspace.simulationResults.manual ?? workspace.simulationResults.monteCarlo;
    };
    const activeLedgerSlotId = compareResults.slotOrder.includes(compareActiveSlotId)
      ? compareActiveSlotId
      : (compareResults.slotOrder[0] ?? 'A');
    const activeSlotResult = resolveSlotResult(compareResults.slots[activeLedgerSlotId]);
    const activeSlotRows = activeSlotResult?.result.rows ?? [];
    const activeSlotStartingAge = activeSlotResult?.configSnapshot?.coreParams.startingAge ?? startingAge;
    const activeSlotInflationRate = activeSlotResult?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const activeSlotRetirementStartDate =
      activeSlotResult?.configSnapshot?.coreParams.retirementStartDate ?? retirementStartDate;
    const activeSlotMonteCarloTotalP50 =
      simulationMode === SimulationMode.MonteCarlo
        ? (activeSlotResult?.monteCarlo?.percentileCurves.total.p50 ?? null)
        : null;
    const raw =
      tableGranularity === 'annual'
        ? buildAnnualDetailRows(activeSlotRows, activeSlotStartingAge, activeSlotInflationRate, activeSlotRetirementStartDate, activeSlotMonteCarloTotalP50)
        : buildMonthlyDetailRows(activeSlotRows, activeSlotStartingAge, activeSlotInflationRate, activeSlotRetirementStartDate, activeSlotMonteCarloTotalP50);
    return sortDetailRows(raw, tableSort);
  }, [compareActiveSlotId, compareResults, inflationRate, isCompareActive, retirementStartDate, simulationMode, startingAge, tableGranularity, tableSort]);

  const activeLedgerSlotId = isCompareActive
    ? (compareResults.slotOrder.includes(compareActiveSlotId)
        ? compareActiveSlotId
        : (compareResults.slotOrder[0] ?? 'A'))
    : 'A';

  const canonicalBoundary = isCompareActive
    ? (compareResults.slots.A?.lastEditedMonthIndex ?? null)
    : null;

  return {
    rows: isCompareActive ? compareSlotRows : singleSlotRows,
    activeLedgerSlotId,
    canonicalBoundary,
    runInflationRate: (() => {
      if (isCompareActive) {
        const workspace = compareResults.slots[activeLedgerSlotId];
        const preferred =
          simulationMode === SimulationMode.Manual
            ? workspace?.simulationResults.manual
            : workspace?.simulationResults.monteCarlo;
        const slotResult = preferred ?? workspace?.simulationResults.manual ?? workspace?.simulationResults.monteCarlo;
        return slotResult?.configSnapshot?.coreParams.inflationRate ?? null;
      }
      return result?.configSnapshot?.coreParams.inflationRate ?? null;
    })(),
  };
};
