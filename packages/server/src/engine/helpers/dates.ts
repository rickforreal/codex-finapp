import { MonthYear } from '@finapp/shared';

export const monthsBetween = (start: MonthYear, end: MonthYear): number => {
  return (end.year - start.year) * 12 + (end.month - start.month);
};

export const addMonths = (date: MonthYear, months: number): MonthYear => {
  const totalMonths = date.month - 1 + months;
  return {
    year: date.year + Math.floor(totalMonths / 12),
    month: (totalMonths % 12) + 1,
  };
};

export const compareMonthYear = (left: MonthYear, right: MonthYear): number => {
  if (left.year !== right.year) {
    return left.year - right.year;
  }
  return left.month - right.month;
};
