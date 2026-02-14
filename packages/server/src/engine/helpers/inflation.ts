export const inflateAnnualAmount = (
  baseAmount: number,
  inflationRate: number,
  yearsSinceStart: number,
): number => {
  if (yearsSinceStart <= 0) {
    return baseAmount;
  }

  return baseAmount * (1 + inflationRate) ** yearsSinceStart;
};

export const annualToMonthlyRate = (annualRate: number): number => (1 + annualRate) ** (1 / 12) - 1;
