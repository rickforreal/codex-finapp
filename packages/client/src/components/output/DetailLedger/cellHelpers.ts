import { AppMode, type ActualMonthOverride } from '@finapp/shared';

import { formatCurrency, formatPercent } from '../../../lib/format';
import type { DetailRow } from '../../../lib/detailTable';

export type Column = {
  key: keyof DetailRow;
  label: string;
  type: 'text' | 'currency' | 'percent' | 'number';
  sortable?: boolean;
};

export const primaryColumns: Column[] = [
  { key: 'period', label: 'Period', type: 'text', sortable: true },
  { key: 'age', label: 'Age', type: 'number', sortable: true },
];

export const monteCarloReferenceColumns: Column[] = [
  { key: 'startTotalP50', label: 'Start Total (p50)', type: 'currency', sortable: true },
];

export const baseColumns: Column[] = [
  { key: 'startTotal', label: 'Start Total', type: 'currency', sortable: true },
  { key: 'marketMovement', label: 'Market Move', type: 'currency', sortable: true },
  { key: 'returnPct', label: 'Return %', type: 'percent', sortable: true },
  { key: 'withdrawalNominal', label: 'Withdrawal', type: 'currency', sortable: true },
  { key: 'withdrawalReal', label: 'Withdrawal (Real)', type: 'currency', sortable: true },
  { key: 'income', label: 'Income', type: 'currency', sortable: true },
  { key: 'expenses', label: 'Expenses', type: 'currency', sortable: true },
  { key: 'endTotal', label: 'End Total', type: 'currency', sortable: true },
];

export const assetColumns: Column[] = [
  { key: 'startStocks', label: 'Start Stocks', type: 'currency', sortable: true },
  { key: 'startBonds', label: 'Start Bonds', type: 'currency', sortable: true },
  { key: 'startCash', label: 'Start Cash', type: 'currency', sortable: true },
  { key: 'moveStocks', label: 'Move Stocks', type: 'currency', sortable: true },
  { key: 'moveBonds', label: 'Move Bonds', type: 'currency', sortable: true },
  { key: 'moveCash', label: 'Move Cash', type: 'currency', sortable: true },
  { key: 'withdrawalStocks', label: 'Wd Stocks', type: 'currency', sortable: true },
  { key: 'withdrawalBonds', label: 'Wd Bonds', type: 'currency', sortable: true },
  { key: 'withdrawalCash', label: 'Wd Cash', type: 'currency', sortable: true },
  { key: 'endStocks', label: 'End Stocks', type: 'currency', sortable: true },
  { key: 'endBonds', label: 'End Bonds', type: 'currency', sortable: true },
  { key: 'endCash', label: 'End Cash', type: 'currency', sortable: true },
];

export const rowHeight = 32;
export const viewportHeight = 430;
export const overscan = 8;
export const monteCarloReferenceTooltip =
  'Median start-of-period portfolio for this row across Monte Carlo simulations. For month m: p50(startTotal[m]).';
export const monteCarloReferenceColumnTint =
  'color-mix(in srgb, var(--theme-slot-detail-ledger-reference-bg) 88%, var(--theme-slot-detail-ledger-shell-bg) 12%)';
export const monteCarloReferenceColumnText = 'var(--theme-slot-detail-ledger-reference-text)';

export const editableColumnKeys = new Set<keyof DetailRow>([
  'startStocks',
  'startBonds',
  'startCash',
  'withdrawalStocks',
  'withdrawalBonds',
  'withdrawalCash',
]);

export const formatCell = (value: string | number | null, column: Column): string | number => {
  if (value === null) {
    return '—';
  }
  if (column.type === 'currency') {
    return formatCurrency(Math.round(Number(value)));
  }
  if (column.type === 'percent') {
    return formatPercent(Number(value), 2);
  }
  return value as string | number;
};

export const valueToneClass = (row: DetailRow, column: Column): string => {
  if (column.key === 'startTotalP50') {
    return 'text-slate-600';
  }
  if (
    column.key !== 'marketMovement' &&
    column.key !== 'returnPct' &&
    column.key !== 'moveStocks' &&
    column.key !== 'moveBonds' &&
    column.key !== 'moveCash'
  ) {
    return 'text-slate-700';
  }
  const value = Number(row[column.key]);
  if (value > 0) {
    return 'text-emerald-700';
  }
  if (value < 0) {
    return 'text-rose-700';
  }
  return 'text-slate-700';
};

export const isMonteCarloReferenceColumn = (column: Column): boolean => column.key === 'startTotalP50';

export const computeStartBalanceDeltas = (
  row: DetailRow,
  override: ActualMonthOverride | undefined,
): { stocks: number; bonds: number; cash: number; total: number } => {
  if (!override?.startBalances) {
    return { stocks: 0, bonds: 0, cash: 0, total: 0 };
  }
  const stocks =
    override.startBalances.stocks !== undefined ? override.startBalances.stocks - row.startStocks : 0;
  const bonds =
    override.startBalances.bonds !== undefined ? override.startBalances.bonds - row.startBonds : 0;
  const cash =
    override.startBalances.cash !== undefined ? override.startBalances.cash - row.startCash : 0;
  return { stocks, bonds, cash, total: stocks + bonds + cash };
};

export const deriveMonthlyReturnsFromRows = (
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

export const isEditableCell = (
  row: DetailRow,
  column: Column,
  mode: AppMode,
  tableGranularity: 'monthly' | 'annual',
  tableAssetColumnsEnabled: boolean,
  activeLedgerSlotId: string,
  isCompareActive: boolean,
  maxEditableMonthIndex: number,
): boolean =>
  mode === AppMode.Tracking &&
  tableGranularity === 'monthly' &&
  (!isCompareActive || activeLedgerSlotId === 'A') &&
  row.monthIndex > 0 &&
  row.monthIndex <= maxEditableMonthIndex &&
  editableColumnKeys.has(column.key) &&
  tableAssetColumnsEnabled;

export const isCellEdited = (
  row: DetailRow,
  column: Column,
  actualOverridesByMonth: Record<number, ActualMonthOverride>,
): boolean => {
  const override = actualOverridesByMonth[row.monthIndex];
  if (!override) {
    return false;
  }
  switch (column.key) {
    case 'startStocks':
      return override.startBalances?.stocks !== undefined;
    case 'startBonds':
      return override.startBalances?.bonds !== undefined;
    case 'startCash':
      return override.startBalances?.cash !== undefined;
    case 'withdrawalStocks':
      return override.withdrawalsByAsset?.stocks !== undefined;
    case 'withdrawalBonds':
      return override.withdrawalsByAsset?.bonds !== undefined;
    case 'withdrawalCash':
      return override.withdrawalsByAsset?.cash !== undefined;
    default:
      return false;
  }
};

export const displayCellValue = (
  row: DetailRow,
  column: Column,
  actualOverridesByMonth: Record<number, ActualMonthOverride>,
  runInflationRate: number | null = null,
): string | number | null => {
  const override = actualOverridesByMonth[row.monthIndex];
  const deltas = computeStartBalanceDeltas(row, override);
  if (!override) {
    return row[column.key] as string | number | null;
  }
  const startStocks = override.startBalances?.stocks ?? row.startStocks;
  const startBonds = override.startBalances?.bonds ?? row.startBonds;
  const startCash = override.startBalances?.cash ?? row.startCash;
  const moveStocks = row.moveStocks + deltas.stocks;
  const moveBonds = row.moveBonds + deltas.bonds;
  const moveCash = row.moveCash + deltas.cash;
  const wdStocks = override.withdrawalsByAsset?.stocks ?? row.withdrawalStocks;
  const wdBonds = override.withdrawalsByAsset?.bonds ?? row.withdrawalBonds;
  const wdCash = override.withdrawalsByAsset?.cash ?? row.withdrawalCash;
  const withdrawalNominal = wdStocks + wdBonds + wdCash;
  const fallbackInflationFactor =
    row.withdrawalReal > 0 ? row.withdrawalNominal / row.withdrawalReal : 1;
  const inflationFactor =
    runInflationRate === null
      ? fallbackInflationFactor
      : (1 + runInflationRate) ** (row.monthIndex / 12);
  const withdrawalReal = withdrawalNominal / Math.max(inflationFactor, 0.000001);
  const endStocks = startStocks + moveStocks - wdStocks;
  const endBonds = startBonds + moveBonds - wdBonds;
  const endCash = startCash + moveCash - wdCash;
  switch (column.key) {
    case 'startTotal':
      return row.startTotal + deltas.total;
    case 'marketMovement':
      return row.marketMovement + deltas.total;
    case 'returnPct': {
      const adjustedStart = row.startTotal + deltas.total;
      const adjustedMove = row.marketMovement + deltas.total;
      return adjustedStart === 0 ? 0 : adjustedMove / adjustedStart;
    }
    case 'startStocks':
      return override.startBalances?.stocks ?? row.startStocks;
    case 'startBonds':
      return override.startBalances?.bonds ?? row.startBonds;
    case 'startCash':
      return override.startBalances?.cash ?? row.startCash;
    case 'moveStocks':
      return row.moveStocks + deltas.stocks;
    case 'moveBonds':
      return row.moveBonds + deltas.bonds;
    case 'moveCash':
      return row.moveCash + deltas.cash;
    case 'withdrawalStocks':
      return override.withdrawalsByAsset?.stocks ?? row.withdrawalStocks;
    case 'withdrawalBonds':
      return override.withdrawalsByAsset?.bonds ?? row.withdrawalBonds;
    case 'withdrawalCash':
      return override.withdrawalsByAsset?.cash ?? row.withdrawalCash;
    case 'withdrawalNominal':
      return withdrawalNominal;
    case 'withdrawalReal':
      return withdrawalReal;
    case 'endStocks':
      return endStocks;
    case 'endBonds':
      return endBonds;
    case 'endCash':
      return endCash;
    case 'endTotal':
      return endStocks + endBonds + endCash;
    default:
      return row[column.key] as string | number | null;
  }
};
