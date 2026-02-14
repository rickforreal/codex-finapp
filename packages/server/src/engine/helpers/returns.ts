import { annualToMonthlyRate } from './inflation';

const randomNormal = (mean: number, stdDev: number): number => {
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
};

export const generateRandomMonthlyReturn = (annualExpectedReturn: number, annualStdDev: number): number => {
  const monthlyMean = annualToMonthlyRate(annualExpectedReturn);
  const monthlyStdDev = annualStdDev / Math.sqrt(12);
  return randomNormal(monthlyMean, monthlyStdDev);
};
