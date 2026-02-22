import { AssetClass, type MonthlySimulationRow } from '@finapp/shared';

export type DetailTableGranularity = 'monthly' | 'annual';

export type DetailRow = {
  id: string;
  monthIndex: number;
  period: string;
  age: number;
  startTotalP50: number | null;
  startTotal: number;
  endTotal: number;
  marketMovement: number;
  returnPct: number;
  income: number;
  expenses: number;
  withdrawalNominal: number;
  withdrawalReal: number;
  startStocks: number;
  startBonds: number;
  startCash: number;
  moveStocks: number;
  moveBonds: number;
  moveCash: number;
  withdrawalStocks: number;
  withdrawalBonds: number;
  withdrawalCash: number;
  endStocks: number;
  endBonds: number;
  endCash: number;
};

const total = (stocks: number, bonds: number, cash: number): number => stocks + bonds + cash;

const inflationFactor = (inflationRate: number, monthIndexOneBased: number): number =>
  (1 + inflationRate) ** (monthIndexOneBased / 12);

const formatCalendarPeriod = (
  retirementStartDate: { month: number; year: number },
  monthIndexOneBased: number,
): string => {
  const date = new Date(
    retirementStartDate.year,
    retirementStartDate.month - 1 + (monthIndexOneBased - 1),
    1,
  );
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  return `${date.getFullYear()}-${month}`;
};

const toMonthlyRow = (
  row: MonthlySimulationRow,
  startingAge: number,
  inflationRate: number,
  retirementStartDate: { month: number; year: number },
  monteCarloTotalP50: number[] | null,
): DetailRow => {
  const startStocks = row.startBalances[AssetClass.Stocks];
  const startBonds = row.startBalances[AssetClass.Bonds];
  const startCash = row.startBalances[AssetClass.Cash];
  const endStocks = row.endBalances[AssetClass.Stocks];
  const endBonds = row.endBalances[AssetClass.Bonds];
  const endCash = row.endBalances[AssetClass.Cash];
  const moveStocks = row.marketChange[AssetClass.Stocks];
  const moveBonds = row.marketChange[AssetClass.Bonds];
  const moveCash = row.marketChange[AssetClass.Cash];
  const withdrawalStocks = row.withdrawals.byAsset[AssetClass.Stocks];
  const withdrawalBonds = row.withdrawals.byAsset[AssetClass.Bonds];
  const withdrawalCash = row.withdrawals.byAsset[AssetClass.Cash];
  const startTotal = total(startStocks, startBonds, startCash);
  const endTotal = total(endStocks, endBonds, endCash);
  const marketMovement = total(moveStocks, moveBonds, moveCash);
  const returnPct = startTotal > 0 ? marketMovement / startTotal : 0;

  return {
    id: `m-${row.monthIndex}`,
    monthIndex: row.monthIndex,
    period: formatCalendarPeriod(retirementStartDate, row.monthIndex),
    age: startingAge + Math.floor((row.monthIndex - 1) / 12),
    startTotalP50:
      monteCarloTotalP50 === null
        ? null
        : row.monthIndex === 1
          ? startTotal
          : (monteCarloTotalP50[row.monthIndex - 2] ?? null),
    startTotal,
    endTotal,
    marketMovement,
    returnPct,
    income: row.incomeTotal,
    expenses: row.expenseTotal,
    withdrawalNominal: row.withdrawals.actual,
    withdrawalReal: row.withdrawals.actual / inflationFactor(inflationRate, row.monthIndex),
    startStocks,
    startBonds,
    startCash,
    moveStocks,
    moveBonds,
    moveCash,
    withdrawalStocks,
    withdrawalBonds,
    withdrawalCash,
    endStocks,
    endBonds,
    endCash,
  };
};

export const buildMonthlyDetailRows = (
  rows: MonthlySimulationRow[],
  startingAge: number,
  inflationRate: number,
  retirementStartDate: { month: number; year: number },
  monteCarloTotalP50: number[] | null = null,
): DetailRow[] =>
  rows.map((row) => toMonthlyRow(row, startingAge, inflationRate, retirementStartDate, monteCarloTotalP50));

export const buildAnnualDetailRows = (
  rows: MonthlySimulationRow[],
  startingAge: number,
  inflationRate: number,
  retirementStartDate: { month: number; year: number },
  monteCarloTotalP50: number[] | null = null,
): DetailRow[] => {
  const monthly = buildMonthlyDetailRows(
    rows,
    startingAge,
    inflationRate,
    retirementStartDate,
    monteCarloTotalP50,
  );
  const annual = new Map<number, DetailRow[]>();

  monthly.forEach((row, index) => {
    const year = Math.floor(index / 12) + 1;
    const group = annual.get(year) ?? [];
    group.push(row);
    annual.set(year, group);
  });

  return Array.from(annual.entries()).map(([year, group]) => {
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) {
      return {
        id: `y-${year}`,
        monthIndex: year * 12,
        period: `Year ${year}`,
        age: startingAge + year - 1,
        startTotalP50: null,
        startTotal: 0,
        endTotal: 0,
        marketMovement: 0,
        returnPct: 0,
        income: 0,
        expenses: 0,
        withdrawalNominal: 0,
        withdrawalReal: 0,
        startStocks: 0,
        startBonds: 0,
        startCash: 0,
        moveStocks: 0,
        moveBonds: 0,
        moveCash: 0,
        withdrawalStocks: 0,
        withdrawalBonds: 0,
        withdrawalCash: 0,
        endStocks: 0,
        endBonds: 0,
        endCash: 0,
      };
    }

    const sum = (field: keyof DetailRow): number => group.reduce((acc, row) => acc + (row[field] as number), 0);
    const marketMovement = sum('marketMovement');
    const startTotal = first.startTotal;

    return {
      id: `y-${year}`,
      monthIndex: year * 12,
      period: `${retirementStartDate.year + year - 1}`,
      age: startingAge + year - 1,
      startTotalP50: first.startTotalP50,
      startTotal,
      endTotal: last.endTotal,
      marketMovement,
      returnPct: startTotal > 0 ? marketMovement / startTotal : 0,
      income: sum('income'),
      expenses: sum('expenses'),
      withdrawalNominal: sum('withdrawalNominal'),
      withdrawalReal: sum('withdrawalReal'),
      startStocks: first.startStocks,
      startBonds: first.startBonds,
      startCash: first.startCash,
      moveStocks: sum('moveStocks'),
      moveBonds: sum('moveBonds'),
      moveCash: sum('moveCash'),
      withdrawalStocks: sum('withdrawalStocks'),
      withdrawalBonds: sum('withdrawalBonds'),
      withdrawalCash: sum('withdrawalCash'),
      endStocks: last.endStocks,
      endBonds: last.endBonds,
      endCash: last.endCash,
    };
  });
};

const readSortValue = (row: DetailRow, column: string): number | string => {
  if (column === 'period') {
    return row.monthIndex;
  }
  const value = row[column as keyof DetailRow];
  return typeof value === 'number' || typeof value === 'string' ? value : 0;
};

export const sortDetailRows = (
  rows: DetailRow[],
  sort: { column: string; direction: 'asc' | 'desc' } | null,
): DetailRow[] => {
  if (!sort) {
    return rows;
  }

  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = readSortValue(a, sort.column);
    const right = readSortValue(b, sort.column);
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right) * direction;
    }
    return ((left as number) - (right as number)) * direction;
  });
};
