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

export const buildMonthlyInflationFactors = (
  durationMonths: number,
  annualInflationForYear: (year: number) => number,
): number[] => {
  const factors = new Array<number>(durationMonths + 1).fill(1);
  for (let month = 2; month <= durationMonths; month += 1) {
    const previousMonthYear = Math.floor((month - 2) / 12) + 1;
    const monthlyRate = annualToMonthlyRate(annualInflationForYear(previousMonthYear));
    factors[month] = factors[month - 1]! * (1 + monthlyRate);
  }
  return factors;
};
