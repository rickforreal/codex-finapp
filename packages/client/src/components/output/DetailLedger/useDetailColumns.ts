import { useMemo } from 'react';

import { SimulationMode } from '@finapp/shared';

import { useAppStore } from '../../../store/useAppStore';
import {
  type Column,
  primaryColumns,
  monteCarloReferenceColumns,
  baseColumns,
  assetColumns,
} from './cellHelpers';

/**
 * Returns the column definitions for the detail ledger,
 * accounting for simulation mode and breakdown toggle.
 */
export const useDetailColumns = (): {
  columns: Column[];
  tableMinWidthClass: string;
} => {
  const simulationMode = useAppStore((state) => state.simulationMode);
  const tableAssetColumnsEnabled = useAppStore((state) => state.ui.tableAssetColumnsEnabled);

  const columns = useMemo(() => {
    const modeColumns =
      simulationMode === SimulationMode.MonteCarlo
        ? [...primaryColumns, ...monteCarloReferenceColumns, ...baseColumns]
        : [...primaryColumns, ...baseColumns];
    return tableAssetColumnsEnabled ? [...modeColumns, ...assetColumns] : modeColumns;
  }, [simulationMode, tableAssetColumnsEnabled]);

  const tableMinWidthClass = tableAssetColumnsEnabled ? 'min-w-[2300px]' : 'min-w-[1200px]';

  return { columns, tableMinWidthClass };
};
