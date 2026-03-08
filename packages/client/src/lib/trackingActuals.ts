import { MonthYear, type ActualMonthOverride, type ActualOverridesByMonth } from '@finapp/shared';
import { monthsBetween } from './dates';

const sanitizePartialAssetMap = (
  values: ActualMonthOverride['startBalances'] | ActualMonthOverride['withdrawalsByAsset'] | undefined,
): ActualMonthOverride['startBalances'] | undefined => {
  if (!values) {
    return undefined;
  }
  const next: ActualMonthOverride['startBalances'] = {};
  if (values.stocks !== undefined) {
    next.stocks = Math.max(0, Math.round(values.stocks));
  }
  if (values.bonds !== undefined) {
    next.bonds = Math.max(0, Math.round(values.bonds));
  }
  if (values.cash !== undefined) {
    next.cash = Math.max(0, Math.round(values.cash));
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

const sanitizeTrackingActualOverride = (
  override: ActualMonthOverride,
): ActualMonthOverride | null => {
  const startBalances = sanitizePartialAssetMap(override.startBalances);
  const withdrawalsByAsset = sanitizePartialAssetMap(override.withdrawalsByAsset);
  if (!startBalances && !withdrawalsByAsset) {
    return null;
  }
  return {
    startBalances,
    withdrawalsByAsset,
  };
};

export const sanitizeTrackingActualOverrides = (
  overrides: ActualOverridesByMonth,
): ActualOverridesByMonth =>
  Object.fromEntries(
    Object.entries(overrides)
      .map(([month, override]) => [Number(month), override] as const)
      .filter(([month, override]) => Number.isInteger(month) && month > 0 && Boolean(override))
      .map(([month, override]) => [month, sanitizeTrackingActualOverride(override as ActualMonthOverride)] as const)
      .filter((entry): entry is readonly [number, ActualMonthOverride] => entry[1] !== null),
  ) as ActualOverridesByMonth;

export const getCurrentTrackingMonthIndex = (
  portfolioStart: MonthYear,
  now: Date = new Date(),
): number =>
  monthsBetween(portfolioStart, { month: now.getMonth() + 1, year: now.getFullYear() }) + 1;

export const getTrackingEditableMonthUpperBound = (
  portfolioStart: MonthYear,
  portfolioEnd: MonthYear,
  now: Date = new Date(),
): number => {
  const horizonMonths = Math.max(0, monthsBetween(portfolioStart, portfolioEnd));
  if (horizonMonths === 0) {
    return 0;
  }
  const currentMonthIndex = getCurrentTrackingMonthIndex(portfolioStart, now);
  return Math.max(1, Math.min(horizonMonths, currentMonthIndex + 1));
};

export const isTrackingMonthEditable = (
  monthIndex: number,
  portfolioStart: MonthYear,
  portfolioEnd: MonthYear,
  now: Date = new Date(),
): boolean => {
  if (!Number.isInteger(monthIndex) || monthIndex <= 0) {
    return false;
  }
  const upperBound = getTrackingEditableMonthUpperBound(portfolioStart, portfolioEnd, now);
  return monthIndex <= upperBound;
};
