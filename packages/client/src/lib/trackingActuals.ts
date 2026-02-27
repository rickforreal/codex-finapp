import type { ActualMonthOverride, ActualOverridesByMonth } from '@finapp/shared';

type MonthYear = {
  month: number;
  year: number;
};

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
  retirementStartDate: MonthYear,
  now: Date = new Date(),
): number =>
  (now.getFullYear() - retirementStartDate.year) * 12 + (now.getMonth() + 1 - retirementStartDate.month) + 1;

export const getTrackingEditableMonthUpperBound = (
  retirementStartDate: MonthYear,
  retirementDurationYears: number,
  now: Date = new Date(),
): number => {
  const horizonMonths = Math.max(0, Math.round(retirementDurationYears) * 12);
  if (horizonMonths === 0) {
    return 0;
  }
  const currentMonthIndex = getCurrentTrackingMonthIndex(retirementStartDate, now);
  return Math.max(1, Math.min(horizonMonths, currentMonthIndex + 1));
};

export const isTrackingMonthEditable = (
  monthIndex: number,
  retirementStartDate: MonthYear,
  retirementDurationYears: number,
  now: Date = new Date(),
): boolean => {
  if (!Number.isInteger(monthIndex) || monthIndex <= 0) {
    return false;
  }
  const upperBound = getTrackingEditableMonthUpperBound(retirementStartDate, retirementDurationYears, now);
  return monthIndex <= upperBound;
};
