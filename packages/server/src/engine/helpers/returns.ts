import { annualToMonthlyRate } from './inflation';

type RandomFn = () => number;

const randomNormal = (mean: number, stdDev: number, random: RandomFn): number => {
  const u1 = 1 - random();
  const u2 = 1 - random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
};

// Mulberry32 PRNG gives deterministic runs when a seed is provided.
export const createSeededRandom = (seed: number): RandomFn => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const generateRandomMonthlyReturn = (
  annualExpectedReturn: number,
  annualStdDev: number,
  random: RandomFn = Math.random,
): number => {
  const monthlyMean = annualToMonthlyRate(annualExpectedReturn);
  const monthlyStdDev = annualStdDev / Math.sqrt(12);
  return Math.max(-0.9999, randomNormal(monthlyMean, monthlyStdDev, random));
};
