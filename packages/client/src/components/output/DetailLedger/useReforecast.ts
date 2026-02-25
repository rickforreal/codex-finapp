import { useEffect } from 'react';

import { AppMode, SimulationMode } from '@finapp/shared';

import { runSimulation } from '../../../api/simulationApi';
import { getCurrentConfig, useAppStore } from '../../../store/useAppStore';
import { deriveMonthlyReturnsFromRows } from './cellHelpers';

/**
 * Extracted reforecast effect for Tracking + Manual mode.
 * Fires with a 500ms debounce after edits, no blocking overlay.
 */
export const useReforecast = (rowCount: number): void => {
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const actualOverridesByMonth = useAppStore((state) => state.actualOverridesByMonth);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const setReforecastResult = useAppStore((state) => state.setReforecastResult);
  const setSimulationStatus = useAppStore((state) => state.setSimulationStatus);

  useEffect(() => {
    if (mode !== AppMode.Tracking || simulationMode !== SimulationMode.Manual) {
      return;
    }
    if (lastEditedMonthIndex === null) {
      return;
    }
    if (rowCount === 0) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      // No blocking overlay — values stay visible and interactive
      const baselineRows = useAppStore.getState().simulationResults.manual?.result.rows ?? [];
      const monthlyReturns = deriveMonthlyReturnsFromRows(baselineRows);
      void runSimulation({
        config: getCurrentConfig(),
        monthlyReturns,
        actualOverridesByMonth,
      })
        .then((response) => {
          const state = useAppStore.getState();
          const visibleRows =
            (state.simulationResults.reforecast ?? state.simulationResults.manual)?.result.rows ?? [];
          const boundary = state.lastEditedMonthIndex ?? 0;
          const mergedRows = [...response.result.rows];

          if (boundary > 0 && visibleRows.length === mergedRows.length) {
            for (let index = 0; index < boundary; index += 1) {
              mergedRows[index] = visibleRows[index] ?? mergedRows[index]!;
            }
          }

          const terminal = mergedRows[mergedRows.length - 1]?.endBalances;
          const terminalPortfolioValue = terminal
            ? terminal.stocks + terminal.bonds + terminal.cash
            : response.result.summary.terminalPortfolioValue;

          setReforecastResult({
            ...response,
            result: {
              ...response.result,
              rows: mergedRows,
              summary: {
                ...response.result.summary,
                terminalPortfolioValue,
              },
            },
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          const message = error instanceof Error ? error.message : 'Reforecast failed';
          setSimulationStatus('error', message);
        });
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    actualOverridesByMonth,
    lastEditedMonthIndex,
    mode,
    rowCount,
    setReforecastResult,
    setSimulationStatus,
    simulationMode,
  ]);
};
