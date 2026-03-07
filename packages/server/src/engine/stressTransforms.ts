import type { MonthlyReturns, StressScenario } from '@finapp/shared';

export type StressTransformDescriptor = {
  projectedStartMonth: number;
  scenario: StressScenario;
};

const toMonthlyRate = (annualRate: number): number => (1 + annualRate) ** (1 / 12) - 1;

const toTimelineMonth = (projectedStartMonth: number, startYear: number): number =>
  projectedStartMonth + (startYear - 1) * 12;

const cloneReturns = (returns: MonthlyReturns[]): MonthlyReturns[] => returns.map((value) => ({ ...value }));

const applyCrashToMonth = (month: MonthlyReturns, stockShock = 0, bondShock = 0): MonthlyReturns => ({
  stocks: (1 + month.stocks) * (1 + stockShock) - 1,
  bonds: (1 + month.bonds) * (1 + bondShock) - 1,
  cash: month.cash,
});

export const returnsWithStressTransform = (
  descriptor: StressTransformDescriptor,
  baselineReturns: MonthlyReturns[],
): MonthlyReturns[] => {
  const returns = cloneReturns(baselineReturns);
  const startMonth = toTimelineMonth(descriptor.projectedStartMonth, descriptor.scenario.startYear);
  const startIndex = Math.max(0, startMonth - 1);

  if (startIndex >= returns.length) {
    return returns;
  }

  if (descriptor.scenario.type === 'stockCrash') {
    returns[startIndex] = applyCrashToMonth(
      returns[startIndex] ?? { stocks: 0, bonds: 0, cash: 0 },
      descriptor.scenario.params.dropPct,
      0,
    );
    return returns;
  }
  if (descriptor.scenario.type === 'bondCrash') {
    returns[startIndex] = applyCrashToMonth(
      returns[startIndex] ?? { stocks: 0, bonds: 0, cash: 0 },
      0,
      descriptor.scenario.params.dropPct,
    );
    return returns;
  }
  if (descriptor.scenario.type === 'broadMarketCrash') {
    returns[startIndex] = applyCrashToMonth(
      returns[startIndex] ?? { stocks: 0, bonds: 0, cash: 0 },
      descriptor.scenario.params.stockDropPct,
      descriptor.scenario.params.bondDropPct,
    );
    return returns;
  }
  if (descriptor.scenario.type === 'prolongedBear') {
    const stockMonthly = toMonthlyRate(descriptor.scenario.params.stockAnnualReturn);
    const bondMonthly = toMonthlyRate(descriptor.scenario.params.bondAnnualReturn);
    const months = descriptor.scenario.params.durationYears * 12;
    for (let index = startIndex; index < Math.min(returns.length, startIndex + months); index += 1) {
      const current = returns[index];
      if (!current) {
        continue;
      }
      returns[index] = {
        stocks: stockMonthly,
        bonds: bondMonthly,
        cash: current.cash,
      };
    }
    return returns;
  }
  if (descriptor.scenario.type === 'custom') {
    for (const entry of descriptor.scenario.params.years) {
      const yearStartIndex = startIndex + (entry.yearOffset - 1) * 12;
      const stocksMonthly = toMonthlyRate(entry.stocksAnnualReturn);
      const bondsMonthly = toMonthlyRate(entry.bondsAnnualReturn);
      const cashMonthly = toMonthlyRate(entry.cashAnnualReturn);
      for (let index = yearStartIndex; index < Math.min(returns.length, yearStartIndex + 12); index += 1) {
        returns[index] = {
          stocks: stocksMonthly,
          bonds: bondsMonthly,
          cash: cashMonthly,
        };
      }
    }
  }

  return returns;
};

export const inflationOverridesForScenario = (
  descriptor: StressTransformDescriptor,
): Partial<Record<number, number>> => {
  if (descriptor.scenario.type !== 'highInflationSpike') {
    return {};
  }

  const startMonth = toTimelineMonth(descriptor.projectedStartMonth, descriptor.scenario.startYear);
  const startYear = Math.floor((startMonth - 1) / 12) + 1;
  const overrides: Partial<Record<number, number>> = {};
  for (let offset = 0; offset < descriptor.scenario.params.durationYears; offset += 1) {
    overrides[startYear + offset] = descriptor.scenario.params.inflationRate;
  }
  return overrides;
};
